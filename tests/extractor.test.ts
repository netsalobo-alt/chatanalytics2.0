import { 
  extractCPFFromText, 
  extractBirthDateFromText, 
  extractCNHFromText, 
  extractDataFromClientMessages,
  isValidCalendarDate,
  calculateAge
} from '../server/localExtractor.ts';
import { validateCPF, formatCPF, cleanCPF } from '../server/cpf.ts';
import { forceSearchCpfForLead } from '../server/chatwoot.ts';
import { upsertLead } from '../server/storage.ts';

// Simple lightweight test runner
let passedTests = 0;
let failedTests = 0;

function assert(condition: boolean, testName: string, errorDetail?: string) {
  if (condition) {
    console.log(`  ✅ PASS: ${testName}`);
    passedTests++;
  } else {
    console.error(`  ❌ FAIL: ${testName}`);
    if (errorDetail) console.error(`     Details: ${errorDetail}`);
    failedTests++;
  }
}

async function runAllTests() {
  console.log('\n======================================================');
  console.log('🧪 Executando Testes Automatizados - ChatAnalytics 2.0 (Etapa 2)');
  console.log('======================================================\n');

  // --- 1. CPF Válido ---
  console.log('👉 [1/9] Testes de CPF Válido:');
  // Known mathematically valid test CPFs (standard test vectors)
  const validCpf1 = '52998224725';
  const validCpf2 = '00100200388'; // standard test vector check digits
  // Generate mathematically valid test vector: 111.444.777-05
  // Let's test with real modulo 11 valid CPFs:
  // e.g. 123456789 -> d1 = 9, d2 = 9 => 12345678909
  // Let's verify with validateCPF:
  const testValidCPF = '52998224725';
  assert(validateCPF(testValidCPF) === true, 'validateCPF aceita CPF matematicamente válido');
  
  const extractedCpfValid = extractCPFFromText(`Olá, meu documento é ${testValidCPF}, favor cadastrar.`);
  assert(extractedCpfValid !== null && extractedCpfValid.valid === true, 'extractCPFFromText identifica CPF válido sem pontuação');
  assert(extractedCpfValid?.formatted === '529.982.247-25', 'extractCPFFromText formata CPF corretamente');

  // --- 2. CPF Inválido ---
  console.log('\n👉 [2/9] Testes de CPF Inválido:');
  const invalidCpfDigits = '52998224799'; // wrong check digits
  assert(validateCPF(invalidCpfDigits) === false, 'validateCPF rejeita CPF com dígitos verificadores incorretos');
  
  const extractedInvalid = extractCPFFromText(`Segue meu cpf ${invalidCpfDigits}`);
  assert(extractedInvalid === null || extractedInvalid.valid === false, 'extractCPFFromText rejeita CPF com dígitos errados');

  // Repeated sequence rejection (e.g. 11111111111, 22222222222)
  const repeatedCpf = '11111111111';
  assert(validateCPF(repeatedCpf) === false, 'validateCPF rejeita sequências repetidas (11111111111)');
  const extractedRepeated = extractCPFFromText(`Meu cpf é 111.111.111-11`);
  assert(extractedRepeated === null || extractedRepeated.valid === false, 'extractCPFFromText rejeita 111.111.111-11');

  // --- 3. CPF Formatado ---
  console.log('\n👉 [3/9] Testes de CPF Formatado:');
  const formattedCpfString = '529.982.247-25';
  assert(cleanCPF(formattedCpfString) === '52998224725', 'cleanCPF remove pontuação corretamente');
  assert(formatCPF('52998224725') === '529.982.247-25', 'formatCPF formata 11 dígitos com pontos e traço');

  const extractedFormatted = extractCPFFromText(`Bom dia, anote meu CPF: 529.982.247-25 por favor.`);
  assert(extractedFormatted !== null && extractedFormatted.valid === true, 'extractCPFFromText detecta CPF com pontuação');
  assert(extractedFormatted?.formatted === '529.982.247-25', 'extractCPFFromText retorna formato canônico');

  // --- 4. Nascimento Válido ---
  console.log('\n👉 [4/9] Testes de Nascimento Válido:');
  // Fixed reference year 2026 for consistent testing
  const refDate2026 = new Date(2026, 9, 28); // 2026-10-28

  // DD/MM/AAAA with context
  const birth1 = extractBirthDateFromText('Minha data de nascimento é 15/05/1992', refDate2026);
  assert(birth1 !== null && birth1.valid === true, 'Identifica nascimento com contexto "data de nascimento"');
  assert(birth1?.formattedDate === '15/05/1992', 'Salva data no formato canônico DD/MM/AAAA');
  assert(birth1?.age === 34, `Idade calculada corretamente (esperado: 34, obtido: ${birth1?.age})`);

  // DD-MM-AAAA with "nasci"
  const birth2 = extractBirthDateFromText('Eu nasci em 20-03-2000', refDate2026);
  assert(birth2 !== null && birth2.valid === true, 'Identifica nascimento com formato traço DD-MM-AAAA e palavra "nasci"');
  assert(birth2?.formattedDate === '20/03/2000', 'Converte formato de traço para DD/MM/AAAA');

  // DD.MM.AAAA with "DN"
  const birth3 = extractBirthDateFromText('DN: 08.12.1985', refDate2026);
  assert(birth3 !== null && birth3.valid === true, 'Identifica nascimento com formato ponto DD.MM.AAAA e palavra "DN"');
  assert(birth3?.formattedDate === '08/12/1985', 'Converte formato de ponto para DD/MM/AAAA');

  // Leap year Feb 29 (e.g. 29/02/1996 was a leap year)
  assert(isValidCalendarDate(29, 2, 1996) === true, 'Ano bissexto aceita 29/02/1996');

  // --- 5. Nascimento Inválido ---
  console.log('\n👉 [5/9] Testes de Nascimento Inválido:');
  // Non-existent calendar date: 31/02/1990
  assert(isValidCalendarDate(31, 2, 1990) === false, 'Data inexistente: 31/02 rejeitada por calendário');
  const invalidDateExtract = extractBirthDateFromText('Data de nascimento: 31/02/1990', refDate2026);
  assert(invalidDateExtract === null || invalidDateExtract.valid === false, 'extractBirthDateFromText rejeita 31/02/1990');

  // Non-leap year Feb 29: 29/02/1997
  assert(isValidCalendarDate(29, 2, 1997) === false, 'Data inexistente: 29/02/1997 não bissexto rejeitado');

  // Age out of range: < 14 years (e.g. born in 2020 -> age 6 in 2026)
  const childExtract = extractBirthDateFromText('Nasci em 10/01/2020', refDate2026);
  assert(childExtract === null || childExtract.valid === false, 'Rejeita idade menor que 14 anos (criança)');

  // Age out of range: > 100 years (e.g. born in 1910 -> age 116 in 2026)
  const over100Extract = extractBirthDateFromText('Data de nascimento: 10/01/1910', refDate2026);
  assert(over100Extract === null || over100Extract.valid === false, 'Rejeita idade maior que 100 anos');

  // --- 6. CNH SIM ---
  console.log('\n👉 [6/9] Testes de CNH SIM:');
  assert(extractCNHFromText('Sim, tenho CNH') === 'SIM', 'Identifica "tenho CNH" -> SIM');
  assert(extractCNHFromText('Eu possuo habilitação categoria B') === 'SIM', 'Identifica "possuo habilitação" -> SIM');
  assert(extractCNHFromText('sou habilitado') === 'SIM', 'Identifica "sou habilitado" -> SIM');
  assert(extractCNHFromText('já tenho carteira de motorista') === 'SIM', 'Identifica "tenho carteira" -> SIM');

  // --- 7. CNH NÃO ---
  console.log('\n👉 [7/9] Testes de CNH NÃO:');
  assert(extractCNHFromText('não tenho CNH') === 'NÃO', 'Identifica "não tenho CNH" -> NÃO');
  assert(extractCNHFromText('nao sou habilitado') === 'NÃO', 'Identifica "não sou habilitado" -> NÃO');
  assert(extractCNHFromText('ainda estou sem habilitação') === 'NÃO', 'Identifica "sem habilitação" -> NÃO');
  assert(extractCNHFromText('ainda não tirei carteira') === 'NÃO', 'Identifica "ainda não tirei carteira" -> NÃO');
  assert(extractCNHFromText('Boa tarde, quanto custa o carro?') === null, 'Sem menção a CNH retorna null');

  // --- 8. Mensagens Fragmentadas & Janela de 10 minutos ---
  console.log('\n👉 [8/9] Testes de Mensagens Fragmentadas:');
  const now = Date.now();
  const fragmentedMessages = [
    { text: 'Oi, meu CPF é 529.982.247-25', timestamp: now - 5 * 60 * 1000 }, // 5 min ago
    { text: 'Nasci em 15/05/1990', timestamp: now - 3 * 60 * 1000 },           // 3 min ago
    { text: 'E sim, tenho carteira de motorista', timestamp: now - 1 * 60 * 1000 } // 1 min ago
  ];

  const extractedFragmented = extractDataFromClientMessages(fragmentedMessages, undefined, now);
  assert(extractedFragmented.cpf === '529.982.247-25', 'Fragmentação: CPF extraído da mensagem 1');
  assert(extractedFragmented.birth_date === '15/05/1990', 'Fragmentação: Nascimento extraído da mensagem 2');
  assert(extractedFragmented.cnh === 'SIM', 'Fragmentação: CNH extraída da mensagem 3');
  assert(extractedFragmented.field_origins.cpf === 'LOCAL', 'Origem do CPF é LOCAL');
  assert(extractedFragmented.field_origins.birth_date === 'LOCAL', 'Origem do Nascimento é LOCAL');
  assert(extractedFragmented.field_origins.cnh === 'LOCAL', 'Origem da CNH é LOCAL');

  // Expiradas: mensagens com mais de 10 minutos não devem ser usadas
  const expiredMessages = [
    { text: 'Meu CPF é 529.982.247-25', timestamp: now - 15 * 60 * 1000 } // 15 min ago (fora da janela)
  ];
  const extractedExpired = extractDataFromClientMessages(expiredMessages, undefined, now);
  assert(!extractedExpired.cpf, 'Mensagem com mais de 10 minutos é descartada pela janela de tempo');

  // --- 9. Mensagens Outgoing Sendo Ignoradas ---
  console.log('\n👉 [9/9] Testes de Mensagens Outgoing Ignoradas:');
  const mixedMessages = [
    { text: 'Por favor, me informe seu CPF 529.982.247-25', timestamp: now - 2 * 60 * 1000, isOutgoing: true }, // Atendente falando
    { text: 'Não tenho documento agora', timestamp: now - 1 * 60 * 1000, isOutgoing: false }
  ];
  const extractedMixed = extractDataFromClientMessages(mixedMessages, undefined, now);
  assert(extractedMixed.cpf === undefined, 'Mensagem outgoing com CPF é sumariamente IGNORADA');

  // --- BÔNUS: Conflito de CPF & Precedência Manual ---
  console.log('\n👉 [BÔNUS] Conflito de CPF e Prioridade SDR:');
  // Existing lead has CPF 529.982.247-25
  const existingLead = {
    cpf: '529.982.247-25',
    cpf_valid: true,
    birth_date: '10/10/1980',
    field_origins: { cpf: 'LOCAL' as const, birth_date: 'MANUAL' as const },
    manual_fields: ['birth_date']
  };

  // Client sends another mathematically valid CPF (e.g., 11144477735)
  const conflictMessages = [
    { text: 'Na verdade meu CPF é 11144477735 e nasci em 01/01/1995', timestamp: now }
  ];
  const conflictResult = extractDataFromClientMessages(conflictMessages, existingLead, now);
  assert(conflictResult.cpf_conflict === true, 'Conflito detectado quando CPF novo difere do CPF existente');
  assert(conflictResult.cpf === '529.982.247-25', 'Não sobrescreve CPF existente com o novo em caso de conflito');
  assert(conflictResult.birth_date === '10/10/1980', 'Precedência MANUAL: Não sobrescreve data de nascimento editada pelo SDR');

  // --- 10. Ação Rápida: Forçar Busca de CPF ---
  console.log('\n👉 [10/10] Testes de Ação Rápida - Forçar Busca de CPF:');
  
  // Test case 10.1: Lead has incoming message with valid CPF -> forceSearchCpf finds it and sets origin LOCAL
  const id1 = Date.now() + 101;
  const { lead: testLead1 } = upsertLead({
    account_id: 'test_acc',
    contact_id: id1,
    conversation_id: 0,
    contact_name: 'Lead Teste Busca CPF',
    entry_date: new Date().toISOString(),
    status: 'NOVO LEAD',
    recent_client_messages: [
      { text: 'Boa tarde, segue meu CPF 529.982.247-25 para cadastro', timestamp: now }
    ]
  });

  const searchResult1 = await forceSearchCpfForLead(testLead1.id);
  assert(searchResult1.success === true, 'forceSearchCpfForLead retorna success=true');
  assert(searchResult1.found === true, 'forceSearchCpfForLead localiza CPF na mensagem do cliente');
  assert(searchResult1.cpf === '529.982.247-25', 'forceSearchCpfForLead extrai o CPF formatado corretamente');
  assert(searchResult1.lead?.field_origins?.cpf === 'LOCAL', 'forceSearchCpfForLead atribui origem LOCAL ao CPF');
  assert(searchResult1.lead?.cpf_valid === true, 'forceSearchCpfForLead valida o CPF encontrado');

  // Test case 10.2: Lead has only invalid CPF sequence in messages -> rejected
  const id2 = Date.now() + 102;
  const { lead: testLead2 } = upsertLead({
    account_id: 'test_acc',
    contact_id: id2,
    conversation_id: 0,
    contact_name: 'Lead Com CPF Inválido',
    entry_date: new Date().toISOString(),
    status: 'NOVO LEAD',
    recent_client_messages: [
      { text: 'Meu CPF é 111.111.111-11 ou 529.982.247-99', timestamp: now }
    ]
  });

  const searchResult2 = await forceSearchCpfForLead(testLead2.id);
  assert(searchResult2.found === false, 'forceSearchCpfForLead rejeita mensagens com apenas CPFs inválidos');

  // Test case 10.3: Lead already has CPF and messages contain different valid CPF -> flag conflict, keep original
  const id3 = Date.now() + 103;
  const { lead: testLead3 } = upsertLead({
    account_id: 'test_acc',
    contact_id: id3,
    conversation_id: 0,
    contact_name: 'Lead Com Conflito',
    entry_date: new Date().toISOString(),
    cpf: '529.982.247-25',
    status: 'NOVO LEAD',
    recent_client_messages: [
      { text: 'Por engano mandei o anterior, meu CPF real é 11144477735', timestamp: now }
    ]
  });

  const searchResult3 = await forceSearchCpfForLead(testLead3.id);
  assert(searchResult3.found === true, 'forceSearchCpfForLead detecta novo CPF válido');
  assert(searchResult3.conflict === true, 'forceSearchCpfForLead marca conflito quando novo CPF difere do existente');
  assert(searchResult3.lead?.cpf === '529.982.247-25', 'forceSearchCpfForLead preserva CPF original sem substituição cega');
  assert(searchResult3.lead?.cpf_conflict === true, 'forceSearchCpfForLead registra flag cpf_conflict no registro do lead');

  // Test case 10.4: Sincronização conjunta de CPF, Data de Nascimento e CNH (SIM)
  const id4 = Date.now() + 104;
  const now4 = Date.now();
  const { lead: testLead4 } = upsertLead({
    account_id: 'test_acc',
    contact_id: id4,
    conversation_id: 0,
    contact_name: 'Lead Completo Dados',
    entry_date: new Date().toISOString(),
    status: 'NOVO LEAD',
    recent_client_messages: [
      { text: 'Olá, meu CPF é 529.982.247-25, nasci em 20/08/1992 e sim tenho carteira de motorista', timestamp: now4 }
    ]
  });

  const searchResult4 = await forceSearchCpfForLead(testLead4.id);
  assert(searchResult4.found === true, 'forceSearchCpfForLead localiza múltiplos dados');
  assert(searchResult4.cpf === '529.982.247-25', 'forceSearchCpfForLead sincroniza CPF');
  assert(searchResult4.birth_date === '20/08/1992', 'forceSearchCpfForLead sincroniza Data de Nascimento DD/MM/AAAA');
  assert(searchResult4.cnh === 'SIM', 'forceSearchCpfForLead sincroniza CNH SIM');
  assert(searchResult4.lead?.field_origins?.birth_date === 'LOCAL', 'Origem do nascimento sincronizado é LOCAL');
  assert(searchResult4.lead?.field_origins?.cnh === 'LOCAL', 'Origem da CNH sincronizada é LOCAL');

  // Test case 10.5: Sincronização com CNH negativa ("não tenho CNH")
  const id5 = Date.now() + 105;
  const now5 = Date.now();
  const { lead: testLead5 } = upsertLead({
    account_id: 'test_acc',
    contact_id: id5,
    conversation_id: 0,
    contact_name: 'Lead Sem CNH',
    entry_date: new Date().toISOString(),
    status: 'NOVO LEAD',
    recent_client_messages: [
      { text: 'Meu CPF é 529.982.247-25 e ainda não tenho CNH nem habilitação', timestamp: now5 }
    ]
  });

  const searchResult5 = await forceSearchCpfForLead(testLead5.id);
  assert(searchResult5.cnh === 'NÃO', 'forceSearchCpfForLead sincroniza CNH NÃO quando cliente informa não possuir');

  // --- 11. Exclusão de Lead por Administrador & Intervalos 1m / 2m ---
  console.log('\n👉 [11/11] Testes de Exclusão de Lead por Admin & Intervalo de Consulta:');
  const id6 = Date.now() + 106;
  const { lead: testLead6 } = upsertLead({
    account_id: 'test_acc',
    contact_id: id6,
    conversation_id: 0,
    contact_name: 'Lead Para Deletar',
    entry_date: new Date().toISOString(),
    status: 'NOVO LEAD'
  });

  // Verify lead exists before deletion
  const { getLeadById, deleteLead } = await import('../server/storage.ts');
  assert(getLeadById(testLead6.id) !== undefined, 'Lead criado com sucesso antes do teste de deleção');

  // Delete lead
  const deleteSuccess = deleteLead(testLead6.id);
  assert(deleteSuccess === true, 'deleteLead retorna true ao deletar lead existente');
  assert(getLeadById(testLead6.id) === undefined, 'Lead excluído não é mais encontrado na base de dados');

  // Test intervals 1 min and 2 min
  const { saveConfig, getConfig } = await import('../server/storage.ts');
  saveConfig({ auto_sync_interval_minutes: 1 });
  assert(getConfig().auto_sync_interval_minutes === 1, 'Configuração suporta intervalo de 1 minuto');
  saveConfig({ auto_sync_interval_minutes: 2 });
  assert(getConfig().auto_sync_interval_minutes === 2, 'Configuração suporta intervalo de 2 minutos');

  // --- 12. Atribuição e Desempenho por Múltiplos Canais / Caixas Chatwoot ---
  console.log('\n👉 [12/12] Testes de Atribuição por Múltiplos Canais Chatwoot:');
  const { computeAnalytics } = await import('../server/analytics.ts');
  const nowTime = new Date().toISOString();

  const idChan1 = Date.now() + 201;
  const idChan2 = Date.now() + 202;
  const idChan3 = Date.now() + 203;

  const leadChan1 = upsertLead({
    account_id: 'test_acc',
    contact_id: idChan1,
    conversation_id: 1001,
    contact_name: 'Lead Matriz',
    channel: 'WhatsApp',
    channel_detail: 'WhatsApp Loja Matriz',
    inbox_id: 501,
    inbox_name: 'WhatsApp Loja Matriz',
    entry_date: nowTime,
    status: 'NOVO LEAD'
  }).lead;

  const leadChan2 = upsertLead({
    account_id: 'test_acc',
    contact_id: idChan2,
    conversation_id: 1002,
    contact_name: 'Lead Filial',
    channel: 'WhatsApp',
    channel_detail: 'WhatsApp Loja Filial',
    inbox_id: 502,
    inbox_name: 'WhatsApp Loja Filial',
    entry_date: nowTime,
    status: 'APROVADO',
    vendeu: true,
    valor_venda: 5000
  }).lead;

  const leadChan3 = upsertLead({
    account_id: 'test_acc',
    contact_id: idChan3,
    conversation_id: 1003,
    contact_name: 'Lead Instagram',
    channel: 'Instagram',
    channel_detail: 'Instagram Direct Oficial',
    inbox_id: 503,
    inbox_name: 'Instagram Direct Oficial',
    entry_date: nowTime,
    status: 'NOVO LEAD'
  }).lead;

  const summaryTest = computeAnalytics([leadChan1, leadChan2, leadChan3], { period: 'all' }, 0, []);
  const dist = summaryTest.channel_distribution;

  assert(dist.length >= 3, `Identifica 3 canais distintos quando temos múltiplas caixas (obtido: ${dist.length})`);
  
  const matrizInbox = dist.find(c => c.inbox_id === 501 || c.channel === 'WhatsApp Loja Matriz');
  const filialInbox = dist.find(c => c.inbox_id === 502 || c.channel === 'WhatsApp Loja Filial');
  const instaInbox = dist.find(c => c.inbox_id === 503 || c.channel === 'Instagram Direct Oficial');

  assert(matrizInbox !== undefined, 'Mantém caixa "WhatsApp Loja Matriz" como canal separado');
  assert(filialInbox !== undefined, 'Mantém caixa "WhatsApp Loja Filial" como canal separado');
  assert(instaInbox !== undefined, 'Mantém caixa "Instagram Direct Oficial" como canal separado');
  assert(filialInbox?.leads_converted === 1, 'Registra conversão na caixa correta');
  assert(filialInbox?.total_revenue === 5000, 'Registra receita de R$ 5.000 na caixa filial');

  // --- 13. Webhook em Tempo Real & Log de 50 Acionamentos ---
  console.log('\n👉 [13/13] Testes de Webhook em Tempo Real & Log de Acionamentos:');
  const { handleChatwootWebhook } = await import('../server/chatwoot.ts');
  const { getWebhookLogs, clearWebhookLogs } = await import('../server/storage.ts');

  // Clear previous logs for clean test
  clearWebhookLogs();
  assert(getWebhookLogs().length === 0, 'clearWebhookLogs limpa o histórico de acionamentos');

  // 13.1 Simulate webhook with CPF
  const testContactId = Date.now() + 999;
  const testConvId = 77001;
  const webhookPayload = {
    event: 'message_created',
    id: `msg_${Date.now()}`,
    content: 'Olá! Meu CPF é 529.982.247-25, gostaria de simular um financiamento.',
    message_type: 'incoming',
    created_at: new Date().toISOString(),
    account: { id: 1 },
    conversation: {
      id: testConvId,
      inbox_id: 501,
      contact: {
        id: testContactId,
        name: 'Cliente Realtime Webhook',
        phone_number: '+5511999990000'
      }
    },
    sender: {
      id: testContactId,
      name: 'Cliente Realtime Webhook',
      phone_number: '+5511999990000',
      type: 'contact'
    }
  };

  const webhookResult = await handleChatwootWebhook(webhookPayload, '1', 'https://app.chatwoot.com', '127.0.0.1');
  assert(webhookResult.processed === true, 'handleChatwootWebhook processa evento message_created');
  assert(webhookResult.cpf === '529.982.247-25', 'handleChatwootWebhook extrai CPF em tempo real');

  // Verify lead was created with CPF
  const leadKey = `1_${testContactId}`;
  const savedLead = getLeadById(leadKey);
  assert(savedLead !== undefined, 'Lead criado via webhook em tempo real encontrado na base');
  assert(savedLead?.cpf === '529.982.247-25', 'Lead salvo possui CPF correto extraído da mensagem');
  assert(savedLead?.cpf_valid === true, 'Lead salvo possui cpf_valid true');

  // Verify Webhook Log was recorded
  const logsAfter = getWebhookLogs(50);
  assert(logsAfter.length >= 1, 'Registro de log do webhook foi gravado no banco');
  assert(logsAfter[0].event === 'message_created', 'Log registra evento correto');
  assert(logsAfter[0].status === 'processed', 'Log registra status processed');
  assert(logsAfter[0].cpf_detected === '529.982.247-25', 'Log registra CPF detectado');
  assert(logsAfter[0].conversation_id === testConvId, 'Log registra ID da conversa');

  // 13.2 Test conversation_created event (should NOT be ignored anymore!)
  const convCreatedPayload = {
    event: 'conversation_created',
    id: `conv_${Date.now()}`,
    account: { id: 1 },
    conversation: {
      id: testConvId + 1,
      inbox_id: 501,
      contact: {
        id: testContactId + 1,
        name: 'Cliente Nova Conversa'
      }
    }
  };
  const convRes = await handleChatwootWebhook(convCreatedPayload, '1', 'https://app.chatwoot.com');
  assert(convRes.processed === true && !convRes.ignored, 'handleChatwootWebhook aceita evento conversation_created sem ignorar');

  // 13.3 Test EXACT user payload: automation_event.conversation_opened with nested messages array
  const userPayload = {
    additional_attributes: {},
    can_reply: true,
    channel: "Channel::Api",
    contact_inbox: {
      id: 29578,
      contact_id: 20033,
      inbox_id: 37,
      source_id: "b7fc05fe-e5d1-45ec-8b23-14f05adfae56",
      created_at: "2026-10-03T15:08:17.798Z",
      updated_at: "2026-10-03T15:08:17.798Z",
      hmac_verified: false,
      pubsub_token: "4joVTzJD7ZnCCa3jLx7hnzp5"
    },
    id: 256,
    inbox_id: 37,
    messages: [
      {
        id: 466909,
        content: "cpf 97963950297",
        account_id: 5,
        inbox_id: 37,
        conversation_id: 256,
        message_type: 0,
        created_at: 1793314562,
        updated_at: "2026-10-29T22:56:02.736Z",
        private: false,
        status: "sent",
        source_id: null,
        content_type: "text",
        content_attributes: {},
        sender_type: "Contact",
        sender_id: 20033,
        external_source_ids: {},
        additional_attributes: {},
        processed_message_content: "cpf 97963950297",
        sentiment: {},
        scheduled_message_id: null,
        conversation: {
          assignee_id: null,
          unread_count: 1,
          last_activity_at: 1793314527,
          contact_inbox: {
            source_id: "b7fc05fe-e5d1-45ec-8b23-14f05adfae56"
          }
        },
        sender: {
          additional_attributes: {
            avatar_url_hash: "49d95678335a403781b46cee1c381a0bac09373ac35bfeb7928a761201c4c231",
            last_avatar_sync_at: "2026-09-24T19:39:45Z"
          },
          custom_attributes: {
            waha_whatsapp_jid: "559192687851@c.us",
            waha_whatsapp_lid: "110634448507010@lid",
            waha_whatsapp_chat_id: "110634448507010@lid"
          },
          email: null,
          id: 20033,
          identifier: null,
          name: "Edgard Mendes",
          phone_number: "+5591992687851",
          thumbnail: "https://example.com/avatar.jpg",
          blocked: false,
          type: "contact",
          company_id: null
        }
      }
    ],
    labels: [],
    meta: {
      sender: {
        id: 20033,
        name: "Edgard Mendes",
        phone_number: "+5591992687851",
        type: "contact"
      }
    },
    status: "open",
    account: {
      id: 5,
      name: "VR M2 Ananindeua"
    },
    event: "automation_event.conversation_opened"
  };

  const userRes = await handleChatwootWebhook(userPayload, '5', 'https://conversa.nortetelecom.net.br', '192.168.1.50');
  assert(userRes.processed === true, 'Payload exato do usuário é processado com sucesso');
  assert(!userRes.ignored, 'Payload exato do usuário NÃO é ignorado');
  assert(userRes.cpf === '979.639.502-97', 'CPF do payload exato (97963950297) é extraído e formatado com sucesso');

  const edgardLead = getLeadById('5_20033');
  assert(edgardLead !== undefined, 'Lead do Edgard Mendes (5_20033) criado/atualizado com sucesso');
  assert(edgardLead?.contact_name === 'Edgard Mendes', 'Nome do lead é Edgard Mendes');
  assert(edgardLead?.contact_phone === '+5591992687851', 'Telefone do lead é +5591992687851');
  assert(edgardLead?.cpf === '979.639.502-97', 'CPF salvo no banco é 979.639.502-97');
  assert(edgardLead?.cpf_valid === true, 'cpf_valid é true');
  assert(edgardLead?.conversation_id === 256, 'conversation_id é 256');

  const latestLog = getWebhookLogs(1)[0];
  assert(latestLog.event === 'automation_event.conversation_opened', 'Log grava automation_event.conversation_opened');
  assert(latestLog.cpf_detected === '979.639.502-97', 'Log registra CPF 979.639.502-97 detectado em tempo real');
  assert(latestLog.status === 'processed', 'Log registra status processed');

  console.log('\n======================================================');
  console.log(`📊 Resultado dos Testes: ${passedTests} passaram, ${failedTests} falharam`);
  console.log('======================================================\n');

  if (failedTests > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

runAllTests().catch(err => {
  console.error('Test execution failed:', err);
  process.exit(1);
});
