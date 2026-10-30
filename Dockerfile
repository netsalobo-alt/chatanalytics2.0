# Etapa de compilação e execução do ChatAnalytics
FROM node:22-alpine AS runner

WORKDIR /app

# Instala ferramentas necessárias
RUN apk add --no-cache curl tzdata

# Configura o fuso horário padrão para America/Belem (UTC-3)
ENV TZ=America/Belem
ENV NODE_ENV=production
ENV PORT=3000

# Copia arquivos de dependências
COPY package*.json ./

# Instala todas as dependências (com --legacy-peer-deps para evitar conflitos de peer)
RUN npm install --legacy-peer-deps

# Copia todo o código fonte
COPY . .

# Compila o frontend React (Vite SPA) gerando a pasta /dist
RUN npm run build

# Cria pasta de dados persistentes para volume local
RUN mkdir -p /app/data

# Expõe a porta 3000
EXPOSE 3000

# Healthcheck para monitoramento no Portainer
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD curl -f http://localhost:3000/api/config || exit 1

# Comando de inicialização
CMD ["npm", "start"]
