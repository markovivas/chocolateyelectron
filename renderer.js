// Este script é executado na janela da interface (Renderer Process)

document.addEventListener('DOMContentLoaded', () => {
  // --- Elementos da UI ---
  const btnInstallChoco = document.getElementById('btnInstallChoco');
  const btnInstallSelected = document.getElementById('btnInstallSelected');
  const btnSelectAll = document.getElementById('btnSelectAll');
  const btnDeselectAll = document.getElementById('btnDeselectAll');
  const progressBar = document.getElementById('progressBar');
  const progressText = document.getElementById('progressText');
  const selectionSummary = document.getElementById('selectionSummary');
  const allPackageCheckboxes = document.querySelectorAll('.pkg-checkbox');
  const logViewer = document.getElementById('logViewer');

  // --- Funções da UI ---
  const updateSelectionSummary = () => {
    const selectedCount = document.querySelectorAll('.pkg-checkbox:checked').length;
    if (selectedCount > 0) {
      btnInstallSelected.innerHTML = `<span class="counter">3</span> Instalar Programas Selecionados (${selectedCount})`;
      selectionSummary.textContent = `${selectedCount} programa(s) selecionado(s) para instalação`;
    } else {
      btnInstallSelected.innerHTML = `<span class="counter">3</span> Instalar Programas Selecionados`;
      selectionSummary.textContent = 'Nenhum programa selecionado';
    }
  };

  const updateProgressBar = (percent) => {
    progressBar.style.width = `${percent}%`;
    progressBar.textContent = `${percent}%`;
  };

  const updateProgressText = (text) => {
    progressText.textContent = text;
  };

  const appendToLog = (text) => {
    logViewer.style.display = 'block';
    logViewer.textContent += text;
    logViewer.scrollTop = logViewer.scrollHeight; // Rola para o final
  };

  const toggleButtons = (disabled) => {
    btnInstallChoco.disabled = disabled;
    btnInstallSelected.disabled = disabled;
    btnSelectAll.disabled = disabled;
    btnDeselectAll.disabled = disabled;
  };

  const setPackageStatus = (packageValue, status) => {
    const checkbox = document.querySelector(`.pkg-checkbox[value="${packageValue}"]`);
    if (checkbox) {
      const indicator = checkbox.nextElementSibling; // Pega o <span class="status-indicator">
      indicator.className = 'status-indicator'; // Reseta as classes
      if (status) indicator.classList.add(`status-${status}`);
    }
  };

  // --- Lógica de Instalação ---
  const runCommandAndShowOutput = async (command) => {
    try {
      // A Promise será resolvida quando o comando terminar
      const result = await window.electronAPI.runCommand(command);
      return result; // Retorna { code: exitCode }
    } catch (error) {
      appendToLog(`\n--- ERRO FATAL AO EXECUTAR COMANDO ---\n${error.message}\n`);
      return { code: -1 }; // Retorna um código de erro
    }
  };

  const installChocolatey = async () => {
    if (!confirm("Deseja instalar ou atualizar o Chocolatey?\n\nEsta etapa é necessária para instalar outros programas.")) {
      return;
    }
    toggleButtons(true);
    logViewer.textContent = ''; // Limpa o log
    updateProgressText('Instalando/Atualizando Chocolatey...');
    appendToLog('Iniciando a instalação do Chocolatey. Isso pode levar alguns minutos...\n\n');

    const chocoInstallCommand = `powershell -NoProfile -ExecutionPolicy Bypass -Command "Set-ExecutionPolicy Bypass -Scope Process -Force; [System.Net.ServicePointManager]::SecurityProtocol = [System.Net.ServicePointManager]::SecurityProtocol -bor 3072; iex ((New-Object System.Net.WebClient).DownloadString('https://community.chocolatey.org/install.ps1')) -AcceptLicense"`;
    const result = await runCommandAndShowOutput(chocoInstallCommand);

    if (result.code === 0) {
      alert('Instalação/Atualização do Chocolatey concluída com sucesso!');
    } else {
      alert('Ocorreu um erro durante a instalação do Chocolatey. Verifique o log para mais detalhes.');
    }
    updateProgressText('Aguardando seleção...');
    toggleButtons(false);
  };

  const installSelected = async () => {
    const selectedCheckboxes = document.querySelectorAll('.pkg-checkbox:checked');
    const totalSelected = selectedCheckboxes.length;

    if (totalSelected === 0) {
      alert('Nenhum programa selecionado para instalação.');
      return;
    }

    if (!confirm(`Você selecionou ${totalSelected} programa(s) para instalação.\n\nDeseja continuar?`)) {
      return;
    }

    toggleButtons(true);
    logViewer.textContent = ''; // Limpa o log
    updateProgressBar(0);

    // Reseta todos os indicadores de status
    allPackageCheckboxes.forEach(cb => setPackageStatus(cb.value, null));
    // Marca os selecionados como 'pendente'
    selectedCheckboxes.forEach(cb => setPackageStatus(cb.value, 'waiting'));

    let currentProgress = 0;
    const failedPackages = [];

    for (const checkbox of selectedCheckboxes) {
      const packageValue = checkbox.value;
      currentProgress++;
      const percentComplete = Math.round((currentProgress / totalSelected) * 100);
      
      updateProgressText(`Instalando: ${packageValue} (${currentProgress} de ${totalSelected})`);
      appendToLog(`\n--- Iniciando instalação de: ${packageValue} ---\n`);
      setPackageStatus(packageValue, 'installing');
      updateProgressBar(percentComplete);

      // Busca o comando customizado do atributo data-command ou usa o padrão.
      const customCommand = checkbox.dataset.command;
      const command = customCommand || `choco install ${packageValue} -y --no-progress`;
      
      // Envia o comando para o processo principal e aguarda a conclusão
      const result = await runCommandAndShowOutput(command);

      if (result.code !== 0) {
        setPackageStatus(packageValue, 'failed');
        failedPackages.push(packageValue);
        appendToLog(`\n--- FALHA ao instalar: ${packageValue} (Código de saída: ${result.code}) ---\n`);
        if (!confirm(`A instalação de "${packageValue}" falhou. Deseja continuar com os próximos programas?`)) {
          appendToLog('\n--- Instalação interrompida pelo usuário. ---\n');
          // Marca os restantes como pendentes
          document.querySelectorAll('.status-installing').forEach(el => el.classList.replace('status-installing', 'status-waiting'));
          break; // Interrompe o loop
        }
      } else {
        setPackageStatus(packageValue, 'success');
        appendToLog(`\n--- SUCESSO ao instalar: ${packageValue} ---\n`);
      }
    }

    updateProgressText('Processo de instalação concluído!');
    if (failedPackages.length > 0) {
      alert(`Instalação concluída, mas os seguintes pacotes falharam: ${failedPackages.join(', ')}.\n\nVerifique o log para detalhes e reinicie o computador.`);
    } else {
      alert('Todos os programas selecionados foram instalados com sucesso!\n\nÉ recomendado reiniciar o computador.');
    }
    toggleButtons(false);
  };

  // --- Event Listeners ---
  window.electronAPI.onCommandOutput(appendToLog); // Escuta pelo output dos comandos
  btnInstallChoco.addEventListener('click', installChocolatey);
  btnInstallSelected.addEventListener('click', installSelected);

  btnSelectAll.addEventListener('click', (e) => {
    allPackageCheckboxes.forEach(cb => cb.checked = true);
    updateSelectionSummary();
  });

  btnDeselectAll.addEventListener('click', () => {
    allPackageCheckboxes.forEach(cb => cb.checked = false);
    document.querySelectorAll('[data-category-toggle]').forEach(mcb => mcb.checked = false);
    updateSelectionSummary();
  });

  // Adiciona listener para todos os checkboxes de pacotes
  allPackageCheckboxes.forEach(cb => cb.addEventListener('change', updateSelectionSummary));

  // Lógica para expandir/recolher e marcar/desmarcar categorias
  document.querySelectorAll('.category-header').forEach(header => {
    header.addEventListener('click', (e) => {
      // Não aciona se o clique for no checkbox
      if (e.target.type !== 'checkbox') {
        header.parentElement.classList.toggle('collapsed');
      }
    });
  });

  document.querySelectorAll('[data-category-toggle]').forEach(masterCheckbox => {
    masterCheckbox.addEventListener('change', () => {
      const category = masterCheckbox.dataset.categoryToggle;
      const childCheckboxes = document.querySelectorAll(`#category_${category} .pkg-checkbox`);
      childCheckboxes.forEach(cb => cb.checked = masterCheckbox.checked);
      updateSelectionSummary();
    });
  });

  // Inicializa a contagem
  updateSelectionSummary();
});