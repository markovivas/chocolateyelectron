## Instalador de Programas com Chocolatey (Electron)

Aplicativo desktop em Electron que oferece uma interface gráfica para instalar programas no Windows via Chocolatey, substituindo um antigo script HTA com tecnologias web modernas.

### Requisitos

* **Node.js** (versão LTS recomendada)

### Passos para executar

1. Baixe ou clone o projeto.

2. No terminal, acesse a pasta do projeto:

   ```bash
   cd caminho/para/instalador-electron
   ```

3. Instale as dependências:

   ```bash
   npm install
   ```

4. Inicie a aplicação:

   ```bash
   npm start
   ```

---

## Como Compilar para um Executável (.EXE)

Este projeto utiliza o `electron-builder` para criar um instalador `.exe` para Windows.

1. **Certifique-se de que as dependências estão instaladas:**

   ```bash
   npm install
   ```

2. **Execute o script de build:**

   ```bash
   npm run build
   ```

Após o processo, o instalador estará disponível na pasta `dist/`, criada na raiz do projeto.
