const { contextBridge, ipcRenderer } = require('electron');

// Expõe um objeto 'electronAPI' para a janela da interface (renderer process)
// de forma segura.
contextBridge.exposeInMainWorld('electronAPI', {
  // Função que a interface chamará para executar um comando.
  // Usamos 'invoke' que trabalha com Promises (async/await).
  runCommand: (command) => ipcRenderer.invoke('run-command', command),

  // Função para receber o fluxo de dados (stdout/stderr) do processo principal.
  onCommandOutput: (callback) => ipcRenderer.on('command-output', (_event, data) => callback(data)),
});