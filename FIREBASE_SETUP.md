# Configuração do Firebase + LojaScreen

Este guia explica como configurar o Firebase e testar a integração da LojaScreen.

## 📋 Pré-requisitos

- Conta Google para acessar o [Firebase Console](https://console.firebase.google.com)
- Projeto React Native configurado e rodando

---

## 🔥 Passo 1: Criar Projeto no Firebase

1. Acesse [Firebase Console](https://console.firebase.google.com)
2. Clique em **"Adicionar projeto"**
3. Nome do projeto: `flashcards-concurso` (ou qualquer nome)
4. Desabilite Google Analytics (opcional para desenvolvimento)
5. Clique em **"Criar projeto"**

---

## 🌐 Passo 2: Adicionar App Web

1. No console do Firebase, clique no ícone **Web** (`</>`)
2. Nome do app: `Flashcards Concurso Web`
3. **NÃO** marque "Firebase Hosting" (por enquanto)
4. Clique em **"Registrar app"**
5. Copie as configurações que aparecerão (veremos onde colar no Passo 4)

Exemplo do que copiar:
```javascript
const firebaseConfig = {
  apiKey: "AIzaSyXXXXXXXXXXXXXXXXXXXXXXXXXX",
  authDomain: "seu-projeto.firebaseapp.com",
  projectId: "seu-projeto",
  storageBucket: "seu-projeto.appspot.com",
  messagingSenderId: "123456789012",
  appId: "1:123456789012:web:abcdef1234567890"
};
```

---

## 💾 Passo 3: Configurar Firestore

1. No menu lateral, clique em **"Firestore Database"**
2. Clique em **"Criar banco de dados"**
3. Escolha **"Modo de teste"** (para desenvolvimento)
   - ⚠️ **IMPORTANTE**: No modo de teste, qualquer pessoa pode ler/escrever por 30 dias
   - Depois configure as regras de segurança (veremos no Passo 6)
4. Localização: `us-central` (ou mais próximo do Brasil)
5. Clique em **"Ativar"**

---

## ⚙️ Passo 4: Configurar o App

Abra o arquivo `src/services/firebase.js` e substitua as credenciais:

```javascript
const firebaseConfig = {
  apiKey: "COLE_SEU_API_KEY_AQUI",
  authDomain: "COLE_SEU_AUTH_DOMAIN_AQUI",
  projectId: "COLE_SEU_PROJECT_ID_AQUI",
  storageBucket: "COLE_SEU_STORAGE_BUCKET_AQUI",
  messagingSenderId: "COLE_SEU_MESSAGING_SENDER_ID_AQUI",
  appId: "COLE_SEU_APP_ID_AQUI"
};
```

---

## 📦 Passo 5: Adicionar Dados de Teste

### 5.1 Criar Coleção `products`

1. No Firestore, clique em **"Iniciar coleção"**
2. ID da coleção: `products`
3. Adicione os seguintes documentos:

**Documento 1:**
- ID do documento: `pack_inss_2025`
- Campos:
  ```
  deckId (string): "inss_2025"
  name (string): "INSS 2025 - Pacote Completo"
  description (string): "Todos os conteúdos para o concurso do INSS 2025"
  type (string): "full"
  price (number): 39.90
  playStoreId (string): "pack_inss_2025"
  ```

**Documento 2:**
- ID do documento: `subject_dir_const`
- Campos:
  ```
  deckId (string): "inss_2025"
  name (string): "Direito Constitucional"
  description (string): "Matéria de Direito Constitucional para INSS"
  type (string): "subject"
  price (number): 9.90
  playStoreId (string): "subject_dir_const"
  ```

### 5.2 Criar Coleção `decks`

1. Clique em **"Iniciar coleção"**
2. ID da coleção: `decks`
3. Adicione o seguinte documento:

**Documento 1:**
- ID do documento: `inss_2025`
- Campos:
  ```
  name (string): "INSS 2025 - Técnico"
  description (string): "Deck completo para concurso INSS 2025"
  isPaid (boolean): true
  subjects (array):
    [
      {
        id (string): "dir_const"
        name (string): "Direito Constitucional"
        flashcards (array):
          [
            {
              id (string): "card_001"
              question (string): "<p>Qual é o prazo para recurso em concurso público?</p>"
              answer (string): "<p>30 dias a contar da publicação do resultado</p>"
              level (number): 0
              lastReviewed (null): null
            },
            {
              id (string): "card_002"
              question (string): "<p>Quem julga recursos em concursos federais?</p>"
              answer (string): "<p>A banca organizadora do concurso</p>"
              level (number): 0
              lastReviewed (null): null
            }
          ]
      }
    ]
  ```

---

## 🔒 Passo 6: Configurar Regras de Segurança (Produção)

⚠️ **Importante**: O modo de teste expira em 30 dias. Antes de publicar, configure as regras:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Qualquer um pode ler (app mobile)
    match /{document=**} {
      allow read: if true;
    }

    // Só admin pode escrever (painel admin web)
    match /{document=**} {
      allow write: if request.auth != null &&
                      request.auth.email in ['seu_email@gmail.com'];
    }
  }
}
```

---

## ✅ Passo 7: Testar o App

### 7.1 Instalar dependências

```bash
npm install
```

### 7.2 Iniciar o app

```bash
npm start
```

### 7.3 Abrir no Expo Go

1. Escaneie o QR Code com o Expo Go
2. Navegue para a aba **"Loja"** (ícone de carrinho)
3. Você deve ver os produtos listados:
   - INSS 2025 - Pacote Completo (R$ 39,90)
   - Direito Constitucional (R$ 9,90)

### 7.4 Testar compra simulada

1. Clique em um produto
2. Confirme a "compra" (é gratuito, apenas demonstração)
3. Volte para a aba **"Meus Decks"**
4. O deck comprado deve aparecer junto com os decks criados pelo usuário
5. O deck comprado tem um badge verde **"Comprado"**
6. Decks comprados **não podem ser apagados**

---

## 🧪 Testando Offline

1. **Com internet**: Compre um deck na Loja
2. **Sem internet**:
   - Feche o app completamente
   - Desative WiFi/dados móveis
   - Abra o app novamente
3. O deck comprado deve continuar aparecendo (está no cache local)
4. Os cards do deck devem funcionar normalmente

---

## 🚀 Próximos Passos

### Fase 2 - Google Play Billing (Compras Reais)

Atualmente as compras são simuladas (gratuitas). Para implementar compras reais:

1. Criar conta no [RevenueCat](https://www.revenuecat.com)
2. Configurar produtos na Google Play Console
3. Instalar `react-native-purchases`
4. Implementar fluxo de pagamento real
5. Testar em dispositivo real (Expo Go não suporta In-App Purchase)

### Fase 3 - Painel Admin Web

Para criar/editar decks facilmente:

1. Criar projeto React com Vite
2. Mesmo Firebase config
3. Editor KaTeX para fórmulas
4. Firebase Auth (Google Sign-In) para admin
5. Deploy no Firebase Hosting

---

## 📝 Estrutura de Arquivos

```
src/
├── services/
│   ├── firebase.js          ← Configuração Firebase + funções
│   └── storage.js           ← Cache local (AsyncStorage)
├── screens/
│   ├── LojaScreen.js        ← Tela da loja
│   └── DeckListScreen.js    ← Lista decks (usuário + comprados)
└── data/
    └── mockData.js          ← Dados iniciais (decks padrão)
```

---

## ❓ Troubleshooting

### Erro: "Firebase: No Firebase App '[DEFAULT]' has been created"

**Solução**: Verifique se o `firebaseConfig` está correto em `src/services/firebase.js`

### Erro: "Não foi possível carregar os produtos"

**Causas possíveis**:
1. Firebase não configurado
2. Sem internet
3. Coleção `products` não criada no Firestore
4. Regras de segurança muito restritivas

**Solução**: Verifique o console do Firebase e as regras de segurança

### Deck comprado não aparece

**Solução**:
1. Verifique se o `deckId` no produto corresponde ao ID do documento em `decks`
2. Veja o console do app (Expo) para mensagens de erro

---

## 📞 Suporte

Se encontrar problemas:
1. Verifique o console do navegador/Expo
2. Verifique o console do Firebase (aba "Firestore")
3. Revise as regras de segurança
4. Teste a conexão com internet

---

**Desenvolvido com ❤️ para Flashcards Concurso**
