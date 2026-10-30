import type { ChatwootInbox, LeadRecord } from './types.ts';
import { 
  upsertLead, 
  bulkUpsertLeads, 
  getAllLeads, 
  isMessageProcessed, 
  markMessageProcessed,
  getLeadById,
  getConfig,
  saveConfig,
  getInboxes,
  mergeInboxesWithSavedSettings,
  updateLeadLocalCpf,
  updateLeadLocalData,
  addWebhookLogEntry
} from './storage.ts';
import { 
  extractCPFFromText, 
  extractBirthDateFromText, 
  extractCNHFromText 
} from './localExtractor.ts';
import { cleanCPF, validateCPF } from './cpf.ts';

export interface ChatwootConnectionResult {
  success: boolean;
  message: string;
  inboxes?: ChatwootInbox[];
  latency_ms?: number;
  account_name?: string;
}

export interface SyncHistoryResult {
  success: boolean;
  total_synced: number;
  paid_leads_found: number;
  ganhamos_found: number;
  conversions_updated: number;
  message: string;
}

export async function testChatwootConnection(
  baseUrl: string,
  accountId: string,
  apiToken: string
): Promise<ChatwootConnectionResult> {
  const cleanUrl = baseUrl.replace(/\/+$/, '');
  const startTime = Date.now();

  try {
    const inboxesUrl = `${cleanUrl}/api/v1/accounts/${accountId}/inboxes`;
    const res = await fetch(inboxesUrl, {
      method: 'GET',
      headers: {
        'api_access_token': apiToken,
        'Content-Type': 'application/json'
      }
    });

    const latency = Date.now() - startTime;

    if (!res.ok) {
      if (res.status === 401 || res.status === 403) {
        return {
          success: false,
          message: 'Token de API inválido ou sem permissão para esta conta.',
          latency_ms: latency
        };
      }
      if (res.status === 404) {
        return {
          success: false,
          message: `Conta ${accountId} não encontrada na URL informada.`,
          latency_ms: latency
        };
      }
      return {
        success: false,
        message: `Falha na conexão com Chatwoot: HTTP ${res.status} ${res.statusText}`,
        latency_ms: latency
      };
    }

    const data = await res.json();
    const rawList = (data.payload || data || []).map((ib: any) => ({
      id: Number(ib.id),
      name: ib.name || `Inbox #${ib.id}`,
      channel_type: ib.channel_type || 'Channel::WebWidget',
      phone_number: ib.phone_number || null
    }));
    const inboxesList = mergeInboxesWithSavedSettings(rawList);

    return {
      success: true,
      message: `Conexão estabelecida com sucesso! ${inboxesList.length} caixas de entrada sincronizadas.`,
      inboxes: inboxesList,
      latency_ms: latency
    };
  } catch (error: any) {
    return {
      success: false,
      message: `Não foi possível conectar ao servidor Chatwoot: ${error.message}`,
      latency_ms: Date.now() - startTime
    };
  }
}

export async function updateChatwootConversationLabels(
  baseUrl: string,
  accountId: string,
  apiToken: string,
  conversationId: number,
  labels: string[]
): Promise<boolean> {
  const cleanUrl = baseUrl.replace(/\/+$/, '');
  const url = `${cleanUrl}/api/v1/accounts/${accountId}/conversations/${conversationId}/labels`;
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'api_access_token': apiToken,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ labels })
    });
    return res.ok;
  } catch (e: any) {
    console.warn(`[Chatwoot] Não foi possível atualizar etiquetas na conversa ${conversationId}:`, e.message);
    return false;
  }
}

/**
 * Parses channel type into friendly label and category
 */
/**
 * Parses channel type into friendly label and category
 */
function resolveChannel(
  channelTypeRaw: string, 
  inboxNameRaw?: string, 
  extraHints?: { customAttributes?: any; phone?: string }
): {
  channel: 'WhatsApp' | 'Instagram' | 'Facebook' | 'Webchat' | 'Outros';
  channel_detail: string;
} {
  const lower = (channelTypeRaw || '').toLowerCase();
  const lowerInbox = (inboxNameRaw || '').toLowerCase();
  const customAttrs = extraHints?.customAttributes || {};
  const isWaha = Boolean(customAttrs.waha_whatsapp_jid || customAttrs.waha_whatsapp_lid || customAttrs.waha_whatsapp_chat_id);
  const isPhoneWhatsApp = Boolean(extraHints?.phone && (extraHints.phone.startsWith('+55') || extraHints.phone.startsWith('55')));

  if (lower.includes('whatsapp') || lowerInbox.includes('whatsapp') || lowerInbox.includes('zap') || lowerInbox.includes('wpp') || isWaha) {
    return { channel: 'WhatsApp', channel_detail: inboxNameRaw || (isWaha ? 'WhatsApp API (Waha)' : 'WhatsApp Direct') };
  }
  if (lower.includes('instagram') || lowerInbox.includes('instagram') || lowerInbox.includes('ig') || lowerInbox.includes('direct')) {
    return { channel: 'Instagram', channel_detail: inboxNameRaw || 'Instagram Direct' };
  }
  if (lower.includes('facebook') || lowerInbox.includes('facebook') || lowerInbox.includes('fb') || lowerInbox.includes('messenger')) {
    return { channel: 'Facebook', channel_detail: inboxNameRaw || 'Facebook Leads' };
  }
  if (lower.includes('webwidget') || lower.includes('webchat') || lowerInbox.includes('site') || lowerInbox.includes('webchat')) {
    return { channel: 'Webchat', channel_detail: inboxNameRaw || 'Webchat Site' };
  }
  if (lower.includes('api') && (isWaha || isPhoneWhatsApp)) {
    return { channel: 'WhatsApp', channel_detail: inboxNameRaw || 'WhatsApp API' };
  }
  return { channel: 'Outros', channel_detail: inboxNameRaw || 'Outros Canais' };
}

/**
 * ChatAnalytics 2.0 Inbound Webhook Processor
 * Handles:
 * 1. 'message_created' & 'message_updated'
 * 2. 'conversation_created', 'conversation_updated', 'conversation_opened'
 * 3. 'automation_event.*' (e.g. 'automation_event.conversation_opened', 'automation_event.message_created')
 * 4. Deep real-time reading of conversations for CPF, Birth Date and CNH detection
 * 5. Logs all webhook events to the 50-entry execution log
 */
export async function handleChatwootWebhook(body: any, fallbackAccountId: string, baseUrl: string, clientIp?: string): Promise<{
  processed: boolean;
  ignored?: boolean;
  reason?: string;
  leadId?: string;
  action?: string;
  cpf?: string;
}> {
  if (!body || typeof body !== 'object') {
    addWebhookLogEntry({
      event: 'unknown',
      status: 'error',
      action_summary: 'Corpo da requisição vazio ou formato inválido',
      ip: clientIp,
      raw_payload: body
    });
    return { processed: false, reason: 'empty_body' };
  }

  const rawEvent = String(body.event || body.event_name || 'unknown').toLowerCase();

  // In conversation events or automation events, the root object IS the conversation itself!
  const conversation = (body.conversation && typeof body.conversation === 'object') ? body.conversation : body;
  const contactInbox = conversation.contact_inbox || body.contact_inbox || {};

  // Extract first message sender if available
  const firstMsgSender = (Array.isArray(body.messages) && body.messages[0]?.sender) || (Array.isArray(conversation.messages) && conversation.messages[0]?.sender);
  const sender = body.sender || conversation.sender || conversation.meta?.sender || conversation.contact || firstMsgSender || {};

  const accountId = String(body.account?.id || conversation.account_id || conversation.account?.id || body.account_id || fallbackAccountId || '1');
  const contactId = Number(sender.id || contactInbox.contact_id || conversation.contact_id || conversation.contact?.id || (Array.isArray(conversation.messages) && conversation.messages[0]?.sender_id) || 0);
  const conversationId = Number(conversation.id || body.conversation_id || (Array.isArray(conversation.messages) && conversation.messages[0]?.conversation_id) || body.id || 0);

  // Contact name & phone & email
  const contactName = sender.name || conversation.contact?.name || conversation.meta?.sender?.name || (Array.isArray(conversation.messages) && conversation.messages[0]?.sender?.name) || 'Cliente Chatwoot';
  const contactPhone = sender.phone_number || conversation.contact?.phone_number || conversation.meta?.sender?.phone_number || (Array.isArray(conversation.messages) && conversation.messages[0]?.sender?.phone_number) || '';
  const contactEmail = sender.email || conversation.contact?.email || conversation.meta?.sender?.email || (Array.isArray(conversation.messages) && conversation.messages[0]?.sender?.email) || '';

  // Collect ALL raw messages present in the payload (both single message event or conversation array)
  const allRawMessages: any[] = [];
  if (Array.isArray(body.messages)) allRawMessages.push(...body.messages);
  if (Array.isArray(conversation.messages) && conversation.messages !== body.messages) allRawMessages.push(...conversation.messages);
  if (body.message && typeof body.message === 'object') allRawMessages.push(body.message);
  if (body.content && typeof body.content === 'string') {
    allRawMessages.push({
      id: body.id,
      content: body.content,
      message_type: body.message_type,
      sender_type: body.sender_type,
      created_at: body.created_at,
      sender: body.sender
    });
  }

  // Filter client incoming messages
  const clientIncomingMessages: Array<{ text: string; timestamp: number; message_id?: string | number }> = [];

  for (const msg of allRawMessages) {
    const text = (typeof msg.content === 'string' ? msg.content.trim() : (typeof msg.processed_message_content === 'string' ? msg.processed_message_content.trim() : ''));
    if (!text) continue;
    if (msg.private === true || msg.is_private === true) continue;

    const mType = msg.message_type;
    const isIncoming = mType === 'incoming' || mType === 0 || mType === '0';
    const sType = String(msg.sender_type || msg.sender?.type || '').toLowerCase();
    const isAgent = sType === 'user' || sType === 'agent' || sType === 'bot';

    // Accept if marked as incoming or from a Contact
    if (isIncoming || (!isAgent && (sType === 'contact' || !sType))) {
      let msgTime = Date.now();
      if (msg.created_at) {
        if (typeof msg.created_at === 'number') {
          msgTime = msg.created_at < 10000000000 ? msg.created_at * 1000 : msg.created_at;
        } else if (typeof msg.created_at === 'string') {
          const p = new Date(msg.created_at).getTime();
          if (!isNaN(p)) msgTime = p;
        }
      }
      clientIncomingMessages.push({
        text,
        timestamp: msgTime,
        message_id: msg.id
      });
    }
  }

  // Identify content preview for logging
  const contentPreview = clientIncomingMessages.length > 0
    ? clientIncomingMessages[clientIncomingMessages.length - 1].text.slice(0, 150)
    : (typeof body.content === 'string' ? body.content.slice(0, 150) : '');

  // Check if payload carries conversation or message data
  const hasConversationOrMessages = Boolean(
    conversationId > 0 ||
    contactId > 0 ||
    contactInbox.contact_id ||
    clientIncomingMessages.length > 0 ||
    allRawMessages.length > 0 ||
    body.conversation ||
    body.meta?.sender
  );

  const isAutomationEvent = rawEvent.startsWith('automation_event') || rawEvent.includes('automation');
  const isMessageEvent = rawEvent.includes('message');
  const isConversationEvent = rawEvent.includes('conversation') || rawEvent.includes('opened') || rawEvent.includes('created') || rawEvent.includes('updated');

  if (!hasConversationOrMessages && !isAutomationEvent && !isMessageEvent && !isConversationEvent) {
    const summary = `Evento "${rawEvent}" catalogado (sem dados de conversa ou contato)`;
    addWebhookLogEntry({
      event: rawEvent,
      account_id: accountId,
      status: 'ignored',
      action_summary: summary,
      ip: clientIp,
      raw_payload: body
    });
    return { processed: true, ignored: true, reason: `ignored_event_${rawEvent}` };
  }

  // Ignore private single-message payloads
  if (body.private === true || body.is_private === true || body.message?.private === true) {
    const summary = `Mensagem interna/privada ignorada na conversa #${conversationId}`;
    addWebhookLogEntry({
      event: rawEvent,
      account_id: accountId,
      conversation_id: conversationId || undefined,
      contact_id: contactId || undefined,
      contact_name: contactName,
      message_type: 'private',
      status: 'ignored',
      action_summary: summary,
      ip: clientIp,
      raw_payload: body
    });
    return { processed: true, ignored: true, reason: 'ignored_private_message' };
  }

  // Deduplicate single message events by message_id
  const singleMessageId = body.id && isMessageEvent && !Array.isArray(body.messages) ? body.id : (body.message_id || body.message?.id);
  if (singleMessageId && isMessageEvent) {
    if (isMessageProcessed(singleMessageId)) {
      const summary = `Mensagem repetida (ID #${singleMessageId}) já processada`;
      addWebhookLogEntry({
        event: rawEvent,
        account_id: accountId,
        conversation_id: conversationId,
        contact_id: contactId,
        contact_name: contactName,
        status: 'ignored',
        action_summary: summary,
        ip: clientIp
      });
      return { processed: true, ignored: true, reason: 'duplicate_message_id' };
    }
    markMessageProcessed(singleMessageId);
  }

  if (!contactId && !conversationId) {
    const summary = 'Webhook rejeitado: ausência de identificadores de contato e conversa';
    addWebhookLogEntry({
      event: rawEvent,
      account_id: accountId,
      status: 'error',
      action_summary: summary,
      ip: clientIp,
      raw_payload: body
    });
    return { processed: false, reason: 'missing_contact_and_conversation_identifiers' };
  }

  const effectiveContactId = contactId || conversationId;

  // Channel details & Inbox validation
  const inboxesList = getInboxes();
  const rawInboxId = Number(conversation.inbox_id || body.inbox?.id || body.inbox_id || (Array.isArray(conversation.messages) && conversation.messages[0]?.inbox_id) || 0);
  const matchedInbox = rawInboxId ? inboxesList.find(ib => ib.id === rawInboxId) : undefined;
  
  if (matchedInbox && matchedInbox.enabled === false) {
    const summary = `Caixa #${rawInboxId} ("${matchedInbox.custom_name || matchedInbox.name}") está desativada nas configurações`;
    addWebhookLogEntry({
      event: rawEvent,
      account_id: accountId,
      conversation_id: conversationId,
      contact_id: effectiveContactId,
      contact_name: contactName,
      status: 'ignored',
      action_summary: summary,
      ip: clientIp
    });
    return { processed: true, ignored: true, reason: `ignored_inbox_disabled_${rawInboxId}` };
  }

  const effectiveInboxName = matchedInbox?.custom_name || matchedInbox?.name || body.inbox?.name || conversation.inbox_name || conversation.inbox?.name;
  const channelType = conversation.channel || body.channel || body.inbox?.channel_type || conversation.inbox?.channel_type || matchedInbox?.channel_type || '';
  const customAttrs = sender.custom_attributes || conversation.custom_attributes || body.custom_attributes || {};
  const { channel, channel_detail } = resolveChannel(channelType, effectiveInboxName, { customAttributes: customAttrs, phone: contactPhone });

  // Timestamps
  let messageCreatedAtEpoch = Date.now();
  const rawTime = body.created_at || body.message?.created_at || conversation.created_at || (clientIncomingMessages[0]?.timestamp);
  if (rawTime) {
    if (typeof rawTime === 'number') {
      messageCreatedAtEpoch = rawTime < 10000000000 ? rawTime * 1000 : rawTime;
    } else if (typeof rawTime === 'string') {
      const parsed = new Date(rawTime).getTime();
      if (!isNaN(parsed)) {
        messageCreatedAtEpoch = parsed;
      } else {
        const cleaned = rawTime.replace(' UTC', 'Z').replace(' ', 'T');
        const fallback = new Date(cleaned).getTime();
        if (!isNaN(fallback)) messageCreatedAtEpoch = fallback;
      }
    }
  }
  const interactionIso = new Date(messageCreatedAtEpoch).toISOString();

  // Chatwoot link
  const cleanBase = baseUrl.replace(/\/+$/, '');
  const chatwootUrl = conversationId > 0 
    ? `${cleanBase}/app/accounts/${accountId}/conversations/${conversationId}` 
    : undefined;

  // Labels / tags
  const rawLabels: any[] = conversation.labels || body.labels || [];
  const tags: string[] = rawLabels.map(l => (typeof l === 'string' ? l : l.title || l.name || '')).filter(Boolean);

  // --- EXTRACT CPF, BIRTH DATE AND CNH FROM ALL CLIENT MESSAGES IN THIS WEBHOOK ---
  let extractedCpf: string | undefined = undefined;
  let extractedBirthDate: string | undefined = undefined;
  let extractedCnh: string | undefined = undefined;

  for (const m of clientIncomingMessages) {
    if (!extractedCpf) {
      const res = extractCPFFromText(m.text);
      if (res && res.valid && res.formatted) extractedCpf = res.formatted;
    }
    if (!extractedBirthDate) {
      const res = extractBirthDateFromText(m.text);
      if (res && res.valid && res.formattedDate) extractedBirthDate = res.formattedDate;
    }
    if (!extractedCnh) {
      const res = extractCNHFromText(m.text);
      if (res !== null) extractedCnh = res;
    }
  }

  // Combined text scan if not found individually
  if ((!extractedCpf || !extractedBirthDate || !extractedCnh) && clientIncomingMessages.length > 0) {
    const combined = clientIncomingMessages.map(m => m.text).join(' \n ');
    if (!extractedCpf) {
      const res = extractCPFFromText(combined);
      if (res && res.valid && res.formatted) extractedCpf = res.formatted;
    }
    if (!extractedBirthDate) {
      const res = extractBirthDateFromText(combined);
      if (res && res.valid && res.formattedDate) extractedBirthDate = res.formattedDate;
    }
    if (!extractedCnh) {
      const res = extractCNHFromText(combined);
      if (res !== null) extractedCnh = res;
    }
  }

  const latestMsg = clientIncomingMessages[clientIncomingMessages.length - 1];

  // Upsert Lead
  const { lead, isNew } = upsertLead({
    account_id: accountId,
    contact_id: effectiveContactId,
    conversation_id: conversationId,
    contact_name: contactName,
    contact_phone: contactPhone,
    contact_email: contactEmail,
    channel,
    channel_detail: effectiveInboxName || channel_detail,
    inbox_id: rawInboxId || undefined,
    inbox_name: effectiveInboxName || channel_detail,
    tags,
    last_message: latestMsg?.text || (typeof body.content === 'string' ? body.content : undefined),
    entry_date: interactionIso,
    last_interaction_at: interactionIso,
    chatwoot_url: chatwootUrl,
    status: 'NOVO LEAD',
    cpf: extractedCpf,
    birth_date: extractedBirthDate,
    cnh: extractedCnh,
    recent_client_messages: clientIncomingMessages,
    ...(latestMsg ? {
      incoming_message: latestMsg
    } : {})
  });

  // REAL-TIME DEEP READING (AUTO-DISCOVERY - EXACT SAME POWER AS CLICKING THE MAGNIFYING GLASS):
  // Query conversation messages from Chatwoot API in real-time
  const config = getConfig();
  let deepRes: ForceSearchCpfResult | null = null;
  const targetConvId = conversationId || lead.conversation_id;
  if (config.chatwoot_url && config.api_token && targetConvId) {
    try {
      deepRes = await forceSearchCpfForLead(lead.id, targetConvId);
      if (deepRes && deepRes.found) {
        console.log(`[WebhookRealTime] Sincronização automática em tempo real concluída para ${lead.contact_name}: CPF ${deepRes.cpf || 'N/A'}, Nasc: ${deepRes.birth_date || 'N/A'}, CNH: ${deepRes.cnh || 'N/A'}`);
      }
    } catch (e: any) {
      console.warn(`[WebhookRealTime] Falha na leitura profunda de mensagens via API:`, e?.message);
    }
  }

  // Retrieve freshest lead from DB after deep search
  const freshLead = getLeadById(lead.id) || lead;
  const finalCpf = freshLead.cpf || deepRes?.cpf || extractedCpf;
  const finalBirth = freshLead.birth_date || deepRes?.birth_date || extractedBirthDate;
  const finalCnh = freshLead.cnh || deepRes?.cnh || extractedCnh;

  const detectedItems: string[] = [];
  if (finalCpf) detectedItems.push(`CPF: ${finalCpf}`);
  if (finalBirth) detectedItems.push(`Nasc: ${finalBirth}`);
  if (finalCnh) detectedItems.push(`CNH: ${finalCnh}`);

  const detailsStr = detectedItems.length > 0 ? ` • ${detectedItems.join(' • ')}` : '';
  const actionSummary = isNew
    ? `Novo lead registrado: "${contactName}" (Conversa #${targetConvId || conversationId})${detailsStr}`
    : `Lead atualizado: "${contactName}" (Conversa #${targetConvId || conversationId})${detailsStr}`;

  addWebhookLogEntry({
    event: rawEvent,
    account_id: accountId,
    conversation_id: targetConvId || conversationId,
    contact_id: effectiveContactId,
    contact_name: contactName,
    message_type: clientIncomingMessages.length > 0 ? 'incoming' : 'activity',
    sender_type: 'contact',
    content_preview: contentPreview || `Conversa #${targetConvId || conversationId} (${rawEvent})`,
    status: 'processed',
    action_summary: actionSummary,
    cpf_detected: finalCpf,
    lead_id: freshLead.id,
    ip: clientIp,
    raw_payload: body
  });

  return {
    processed: true,
    leadId: freshLead.id,
    action: isNew ? 'created_new_lead' : 'updated_existing_lead',
    cpf: finalCpf
  };
}

/**
 * Historical Sync with Chatwoot
 */
export async function syncChatwootHistory(
  baseUrl: string,
  accountId: string,
  apiToken: string,
  inboxes: ChatwootInbox[] = []
): Promise<SyncHistoryResult> {
  const cleanUrl = baseUrl.replace(/\/+$/, '');
  const inboxMap = new Map<number, ChatwootInbox>();

  // 1. Actively fetch up-to-date inboxes from Chatwoot to ensure 100% accurate channel names
  try {
    const inboxesRes = await fetch(`${cleanUrl}/api/v1/accounts/${accountId}/inboxes`, {
      headers: {
        'api_access_token': apiToken,
        'Content-Type': 'application/json'
      }
    });
    if (inboxesRes.ok) {
      const ibData = await inboxesRes.json();
      const rawInboxes = (ibData.payload || ibData || []).map((ib: any) => ({
        id: Number(ib.id),
        name: ib.name || `Inbox #${ib.id}`,
        channel_type: ib.channel_type || 'Channel::WebWidget',
        phone_number: ib.phone_number || null
      }));
      const mergedInboxes = mergeInboxesWithSavedSettings(rawInboxes);
      mergedInboxes.forEach(ib => inboxMap.set(ib.id, ib));
    }
  } catch (ibErr: any) {
    console.warn('[Chatwoot] Não foi possível atualizar caixas de entrada automaticamente:', ibErr?.message);
  }

  // Fallback to inboxes passed in argument or stored config
  const currentSavedInboxes = getInboxes();
  currentSavedInboxes.forEach(ib => {
    if (!inboxMap.has(ib.id)) {
      inboxMap.set(ib.id, ib);
    }
  });

  try {
    let page = 1;
    let totalSynced = 0;
    const leadsToUpsert: LeadRecord[] = [];

    // Query active conversations
    while (page <= 5) {
      const url = `${cleanUrl}/api/v1/accounts/${accountId}/conversations?page=${page}&status=all`;
      const res = await fetch(url, {
        headers: {
          'api_access_token': apiToken,
          'Content-Type': 'application/json'
        }
      });

      if (!res.ok) break;

      const data = await res.json();
      const conversations = data.data?.payload || data.payload || [];
      if (!Array.isArray(conversations) || conversations.length === 0) break;

      for (const conv of conversations) {
        const inbox = inboxMap.get(conv.inbox_id);
        
        // If the inbox is explicitly turned off (disabled), skip this conversation!
        if (inbox && inbox.enabled === false) {
          continue;
        }

        const contactId = conv.meta?.sender?.id || conv.contact_inbox?.contact_id || conv.contact_id || conv.id;
        const convId = conv.id;
        const sender = conv.meta?.sender || {};
        const contactName = sender.name || 'Cliente Chatwoot';
        const contactPhone = sender.phone_number || '';
        const contactEmail = sender.email || '';

        const inboxDisplayName = inbox?.custom_name || inbox?.name || conv.inbox_name || (conv.inbox ? conv.inbox.name : undefined);
        const inboxChannelType = inbox?.channel_type || conv.channel || (conv.inbox ? conv.inbox.channel_type : '');
        const { channel, channel_detail } = resolveChannel(inboxChannelType, inboxDisplayName);

        const createdAtEpoch = conv.created_at 
          ? (typeof conv.created_at === 'number' ? conv.created_at * 1000 : new Date(conv.created_at).getTime()) 
          : Date.now();
        const entryIso = new Date(createdAtEpoch).toISOString();

        const lastInteractionEpoch = conv.last_activity_at || conv.updated_at || conv.created_at;
        const lastInteractionIso = lastInteractionEpoch 
          ? new Date(typeof lastInteractionEpoch === 'number' ? lastInteractionEpoch * 1000 : lastInteractionEpoch).toISOString()
          : entryIso;

        const rawLabels = conv.labels || [];
        const tags = rawLabels.map((l: any) => (typeof l === 'string' ? l : l.title || l.name || '')).filter(Boolean);

        const chatwootUrl = `${cleanUrl}/app/accounts/${accountId}/conversations/${convId}`;

        leadsToUpsert.push({
          id: `${accountId}_${contactId}`,
          account_id: String(accountId),
          contact_id: Number(contactId),
          conversation_id: Number(convId),
          contact_name: contactName,
          contact_phone: contactPhone,
          contact_email: contactEmail,
          entry_date: entryIso,
          last_interaction_at: lastInteractionIso,
          status: 'NOVO LEAD',
          vendeu: false,
          valor_venda: 0,
          chatwoot_url: chatwootUrl,
          channel,
          channel_detail: inboxDisplayName || channel_detail,
          inbox_id: conv.inbox_id,
          inbox_name: inboxDisplayName || channel_detail,
          tags,
          is_lead: true,
          is_converted: false
        });
      }

      totalSynced += conversations.length;
      page++;
    }

    if (leadsToUpsert.length > 0) {
      bulkUpsertLeads(leadsToUpsert);
    }

    return {
      success: true,
      total_synced: totalSynced,
      paid_leads_found: leadsToUpsert.length,
      ganhamos_found: 0,
      conversions_updated: 0,
      message: `${leadsToUpsert.length} leads sincronizados com sucesso do Chatwoot.`
    };
  } catch (err: any) {
    return {
      success: false,
      total_synced: 0,
      paid_leads_found: 0,
      ganhamos_found: 0,
      conversions_updated: 0,
      message: `Erro na sincronização: ${err.message}`
    };
  }
}

export interface ForceSearchCpfResult {
  success: boolean;
  found: boolean;
  cpf?: string;
  cpf_valid?: boolean;
  birth_date?: string;
  cnh?: string;
  conflict?: boolean;
  conflict_detail?: string;
  fields_updated?: string[];
  message: string;
  lead?: LeadRecord;
}

/**
 * Quick Action: Sincronizar dados do lead (CPF, Data de Nascimento e CNH)
 * Examina as mensagens do cliente no Chatwoot (via API) e as mensagens recentes recebidas
 * Extrai e valida CPF, Nascimento e CNH, respeitando prioridades (MANUAL > LOCAL) e detectando conflitos.
 */
export async function forceSearchCpfForLead(leadId: string, specificConversationId?: number): Promise<ForceSearchCpfResult> {
  const lead = getLeadById(leadId);
  if (!lead) {
    return {
      success: false,
      found: false,
      message: 'Lead não encontrado.'
    };
  }

  const config = getConfig();
  const candidateTexts: string[] = [];
  let foundInConvId: number | undefined = undefined;

  // 1. Gather all conversation IDs to search (target conversation first, then lead's registered conversation)
  const convIdsToCheck: number[] = [];
  if (specificConversationId && Number(specificConversationId) > 0) {
    convIdsToCheck.push(Number(specificConversationId));
  }
  if (lead.conversation_id && !convIdsToCheck.includes(Number(lead.conversation_id))) {
    convIdsToCheck.push(Number(lead.conversation_id));
  }

  // If Chatwoot integration is configured, query messages from Chatwoot API
  if (config.chatwoot_url && config.api_token) {
    const cleanUrl = config.chatwoot_url.replace(/\/+$/, '');
    const accountId = config.account_id || lead.account_id || '1';

    // Also discover additional conversations for this contact if needed
    if (lead.contact_id && convIdsToCheck.length < 3) {
      try {
        const contactConvsUrl = `${cleanUrl}/api/v1/accounts/${accountId}/contacts/${lead.contact_id}/conversations`;
        const res = await fetch(contactConvsUrl, {
          method: 'GET',
          headers: {
            'api_access_token': config.api_token,
            'Content-Type': 'application/json'
          },
          signal: AbortSignal.timeout(5000)
        });
        if (res.ok) {
          const data = await res.json();
          const convList: any[] = Array.isArray(data.payload) ? data.payload : (Array.isArray(data) ? data : []);
          for (const c of convList) {
            const cid = Number(c.id);
            if (cid && !convIdsToCheck.includes(cid)) {
              convIdsToCheck.push(cid);
            }
          }
        }
      } catch (err: any) {
        console.warn(`[ForceSyncData] Falha ao listar conversas do contato ${lead.contact_id}:`, err?.message);
      }
    }

    // Query messages across the identified conversations
    for (const cId of convIdsToCheck) {
      const convUrl = `${cleanUrl}/api/v1/accounts/${accountId}/conversations/${cId}/messages`;
      try {
        const res = await fetch(convUrl, {
          method: 'GET',
          headers: {
            'api_access_token': config.api_token,
            'Content-Type': 'application/json'
          },
          signal: AbortSignal.timeout(8000)
        });
        if (res.ok) {
          const data = await res.json();
          const messages = Array.isArray(data.payload) ? data.payload : (Array.isArray(data) ? data : []);
          for (const m of messages) {
            const isIncoming = m.message_type === 0 || m.message_type === 'incoming';
            const isPrivate = Boolean(m.private);
            const senderType = String(m.sender?.type || m.sender_type || '').toLowerCase();
            const isAgent = senderType === 'user' || senderType === 'agent';
            const text = (typeof m.content === 'string' ? m.content.trim() : (typeof m.processed_message_content === 'string' ? m.processed_message_content.trim() : ''));
            if ((isIncoming || (!isAgent && (senderType === 'contact' || !senderType))) && !isPrivate && text) {
              if (!candidateTexts.includes(text)) {
                candidateTexts.push(text);
                const cpfCheck = extractCPFFromText(text);
                if (cpfCheck && cpfCheck.valid && !foundInConvId) {
                  foundInConvId = cId;
                }
              }
            }
          }
        }
      } catch (err: any) {
        console.warn(`[ForceSyncData] Falha ao consultar mensagens no Chatwoot API (${cId}):`, err.message);
      }
    }
  }

  // 2. Add recent_client_messages stored in the lead record
  if (Array.isArray(lead.recent_client_messages)) {
    for (const msg of lead.recent_client_messages) {
      if (msg.text && typeof msg.text === 'string' && !candidateTexts.includes(msg.text.trim())) {
        candidateTexts.push(msg.text.trim());
      }
    }
  }

  // 3. Add lead.last_message if not already present
  if (lead.last_message && typeof lead.last_message === 'string' && !candidateTexts.includes(lead.last_message.trim())) {
    candidateTexts.push(lead.last_message.trim());
  }

  // 4. Scan candidate texts for valid CPF, Birth Date, and CNH
  let foundCpfResult: ReturnType<typeof extractCPFFromText> = null;
  let foundBirthDateResult: ReturnType<typeof extractBirthDateFromText> = null;
  let foundCnhResult: ReturnType<typeof extractCNHFromText> = null;

  // Search each message individually first (from most recent to oldest)
  const reversedCandidates = [...candidateTexts].reverse();
  for (const text of reversedCandidates) {
    if (!foundCpfResult) {
      const res = extractCPFFromText(text);
      if (res && res.valid && res.formatted) {
        foundCpfResult = res;
      }
    }
    if (!foundBirthDateResult) {
      const res = extractBirthDateFromText(text);
      if (res && res.valid && res.formattedDate) {
        foundBirthDateResult = res;
      }
    }
    if (!foundCnhResult) {
      const res = extractCNHFromText(text);
      if (res !== null) {
        foundCnhResult = res;
      }
    }
  }

  // If any missing, check combined text (in case information was split across sentences)
  if ((!foundCpfResult || !foundBirthDateResult || !foundCnhResult) && candidateTexts.length > 0) {
    const combined = candidateTexts.join(' \n ');
    if (!foundCpfResult) {
      const res = extractCPFFromText(combined);
      if (res && res.valid && res.formatted) {
        foundCpfResult = res;
      }
    }
    if (!foundBirthDateResult) {
      const res = extractBirthDateFromText(combined);
      if (res && res.valid && res.formattedDate) {
        foundBirthDateResult = res;
      }
    }
    if (!foundCnhResult) {
      const res = extractCNHFromText(combined);
      if (res !== null) {
        foundCnhResult = res;
      }
    }
  }

  const manualFields = new Set<string>(lead.manual_fields || []);
  const existingOrigins = lead.field_origins || {};

  const updates: Parameters<typeof updateLeadLocalData>[1] = {};
  const updatedFieldNames: string[] = [];
  let isCpfConflict = false;
  let cpfConflictDetail: string | undefined = undefined;

  // --- CPF HANDLING ---
  if (foundCpfResult && foundCpfResult.formatted) {
    const cleanFound = cleanCPF(foundCpfResult.clean || foundCpfResult.formatted);
    const cleanExisting = cleanCPF(lead.cpf);

    if (lead.cpf && cleanExisting && validateCPF(cleanExisting)) {
      if (cleanExisting === cleanFound) {
        // Same valid CPF confirmed
        updates.cpf = lead.cpf;
        updates.cpf_valid = true;
        updates.cpf_conflict = false;
        updates.cpf_conflict_detail = undefined;
        updatedFieldNames.push(`CPF ${lead.cpf} (Confirmado)`);
      } else {
        // Conflict: client sent a different valid CPF than currently registered
        isCpfConflict = true;
        cpfConflictDetail = `Conflito de CPF: Lead possui CPF ${lead.cpf} e o cliente enviou ${foundCpfResult.formatted} para conferência manual.`;
        updates.cpf_conflict = true;
        updates.cpf_conflict_detail = cpfConflictDetail;
        updatedFieldNames.push(`Conflito CPF (${foundCpfResult.formatted})`);
      }
    } else {
      const isManual = manualFields.has('cpf') || existingOrigins.cpf === 'MANUAL';
      if (!isManual) {
        // Newly identified valid CPF
        updates.cpf = foundCpfResult.formatted;
        updates.cpf_valid = true;
        updates.origin_cpf = 'LOCAL';
        updates.cpf_conflict = false;
        updates.cpf_conflict_detail = undefined;
        updatedFieldNames.push(`CPF ${foundCpfResult.formatted}`);
      } else {
        updatedFieldNames.push(`CPF ${lead.cpf || ''} (Preservado MANUAL)`);
      }
    }
  }

  // --- BIRTH DATE HANDLING ---
  if (foundBirthDateResult && foundBirthDateResult.formattedDate) {
    const isManual = manualFields.has('birth_date') || existingOrigins.birth_date === 'MANUAL';
    if (!isManual) {
      updates.birth_date = foundBirthDateResult.formattedDate;
      updates.origin_birth_date = 'LOCAL';
      updatedFieldNames.push(`Nascimento ${foundBirthDateResult.formattedDate}`);
    } else {
      updatedFieldNames.push(`Nascimento ${lead.birth_date} (Preservado MANUAL)`);
    }
  }

  // --- CNH HANDLING ---
  if (foundCnhResult !== null) {
    const isManual = manualFields.has('cnh') || existingOrigins.cnh === 'MANUAL';
    if (!isManual) {
      updates.cnh = foundCnhResult;
      updates.origin_cnh = 'LOCAL';
      updatedFieldNames.push(`CNH: ${foundCnhResult}`);
    } else {
      updatedFieldNames.push(`CNH: ${lead.cnh} (Preservado MANUAL)`);
    }
  }

  // If no new data or confirmations were found
  if (updatedFieldNames.length === 0) {
    return {
      success: true,
      found: false,
      message: 'Nenhum CPF, data de nascimento ou CNH foi localizado nas mensagens enviadas pelo cliente.',
      lead
    };
  }

  if (foundInConvId && foundInConvId !== lead.conversation_id) {
    updates.conversation_id = foundInConvId;
    const cleanUrl = config.chatwoot_url?.replace(/\/+$/, '') || '';
    const accountId = config.account_id || lead.account_id || '1';
    if (cleanUrl) {
      updates.chatwoot_url = `${cleanUrl}/app/accounts/${accountId}/conversations/${foundInConvId}`;
    }
  }

  const updatedLead = updateLeadLocalData(lead.id, updates) || lead;

  let message = `Dados sincronizados com sucesso: ${updatedFieldNames.join(' • ')}`;
  if (isCpfConflict && cpfConflictDetail) {
    message = `Atenção: ${cpfConflictDetail} Demais dados sincronizados: ${updatedFieldNames.filter(f => !f.startsWith('Conflito')).join(', ') || 'Nenhum'}`;
  }

  return {
    success: true,
    found: true,
    cpf: updatedLead.cpf,
    cpf_valid: updatedLead.cpf_valid,
    birth_date: updatedLead.birth_date,
    cnh: updatedLead.cnh,
    conflict: isCpfConflict,
    conflict_detail: cpfConflictDetail,
    fields_updated: updatedFieldNames,
    message,
    lead: updatedLead
  };
}

export const forceSyncLeadData = forceSearchCpfForLead;

