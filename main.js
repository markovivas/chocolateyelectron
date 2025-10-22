const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const { spawn } = require('child_process'); // Usar spawn para processos assíncronos

function createWindow() {
  // Cria a janela do navegador.
  const mainWindow = new BrowserWindow({
    width: 950,
    height: 750,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      // A segurança é importante, mas para este caso simples,
      // nodeIntegration e contextIsolation podem ser ajustados se necessário.
      // A abordagem com preload é a mais segura.
      contextIsolation: true,
      nodeIntegration: false,
    }
  });

  // e carrega o index.html do aplicativo.
  mainWindow.loadFile('index.html');

  // Abre o DevTools (ferramentas de desenvolvedor).
  // mainWindow.webContents.openDevTools();
}

// Este método será chamado quando o Electron tiver finalizado
// a inicialização e estiver pronto para criar janelas do navegador.
app.whenReady().then(() => {
  createWindow();

  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

// Encerrar quando todas as janelas forem fechadas, exceto no macOS.
app.on('window-all-closed', function () {
  if (process.platform !== 'darwin') app.quit();
});

// --- Lógica de Instalação ---
// Escuta por um evento 'run-command' vindo da interface (renderer)
ipcMain.handle('run-command', (event, command) => {
  // Usamos ipcMain.handle para trabalhar com Promises e async/await
  return new Promise((resolve, reject) => {
    console.log(`Executando comando: ${command}`);
    // O 'shell: true' é importante para que comandos como 'choco' sejam encontrados no PATH do sistema.
    // Com 'shell: true', é mais robusto passar o comando inteiro como primeiro argumento,
    // especialmente no Windows, para que pipes e outros recursos do shell funcionem corretamente.
    const child = spawn(command, [], { shell: true });

    // Envia a saída do console (stdout) para a interface em tempo real
    child.stdout.on('data', (data) => {
      event.sender.send('command-output', data.toString());
    });

    // Envia a saída de erro (stderr) para a interface em tempo real
    child.stderr.on('data', (data) => {
      event.sender.send('command-output', `[ERRO] ${data.toString()}`);
    });

    child.on('close', (code) => {
      console.log(`Comando finalizado com código: ${code}`);
      resolve({ code }); // Resolve a Promise com o código de saída
    });

    child.on('error', (error) => {
      console.error(`Erro ao iniciar comando: ${command}`, error);
      reject(error); // Rejeita a Promise em caso de erro ao iniciar
    });
  });
});