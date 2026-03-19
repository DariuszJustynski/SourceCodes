const projectPathInput = document.getElementById('projectPath');
const specTextInput = document.getElementById('specText');
const runBtn = document.getElementById('runAuditBtn');
const frontendOnlyInput = document.getElementById('frontendOnly');
const statusNode = document.getElementById('status');
const resultsNode = document.getElementById('results');

function setStatus(message, isError = false) {
  statusNode.textContent = message;
  statusNode.style.color = isError ? '#fca5a5' : '#93c5fd';
}

function renderResult(result) {
  resultsNode.textContent = JSON.stringify(result, null, 2);
}

runBtn.addEventListener('click', async () => {
  const projectPath = projectPathInput.value.trim();
  const specText = specTextInput.value;
  const frontendOnly = frontendOnlyInput.checked;

  if (!projectPath) {
    setStatus('Podaj ścieżkę projektu.', true);
    return;
  }

  setStatus('Uruchamianie audytu...');
  runBtn.disabled = true;

  try {
    const result = await window.api.runAudit({
      projectPath,
      specText,
      frontendOnly
    });

    renderResult(result);
    setStatus(`Zakończono. Błędy: ${result.summary.errors}, Ostrzeżenia: ${result.summary.warnings}`);
  } catch (error) {
    setStatus(`Błąd: ${error.message}`, true);
  } finally {
    runBtn.disabled = false;
  }
});
