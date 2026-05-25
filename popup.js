document.addEventListener('DOMContentLoaded', () => {
    const cbDirect = document.getElementById('cb-direct');
    const cbSubfolder = document.getElementById('cb-subfolder');
    const cbSaveAs = document.getElementById('cb-saveas');
    
    const groupDirect = document.getElementById('option-direct');
    const groupSubfolder = document.getElementById('option-subfolder');
    const groupSaveAs = document.getElementById('option-saveas');
    
    const inputFolderName = document.getElementById('input-foldername');

    function updateUIState() {
        groupDirect.classList.remove('disabled');
        groupSubfolder.classList.remove('disabled');
        groupSaveAs.classList.remove('disabled');
        inputFolderName.disabled = false;

        if (cbDirect.checked) {
            groupSubfolder.classList.add('disabled');
            groupSaveAs.classList.add('disabled');
            inputFolderName.disabled = true;
        } else if (cbSubfolder.checked) {
            groupDirect.classList.add('disabled');
            groupSaveAs.classList.add('disabled');
        } else if (cbSaveAs.checked) {
            groupDirect.classList.add('disabled');
            groupSubfolder.classList.add('disabled');
            inputFolderName.disabled = true;
        }
    }

    function saveSettings() {
        let mode = 'direct';
        if (cbSubfolder.checked) mode = 'subfolder';
        if (cbSaveAs.checked) mode = 'saveAs';

        const folderName = inputFolderName.value.trim();

        chrome.storage.local.set({
            downloadMode: mode,
            subfolderName: folderName
        });
    }

    function handleRadioChange() {
        updateUIState();
        saveSettings();
    }

    cbDirect.addEventListener('change', handleRadioChange);
    cbSubfolder.addEventListener('change', handleRadioChange);
    cbSaveAs.addEventListener('change', handleRadioChange);

    let debounceTimeout;
    inputFolderName.addEventListener('input', () => {
        clearTimeout(debounceTimeout);
        debounceTimeout = setTimeout(saveSettings, 300);
    });


    chrome.storage.local.get(['downloadMode', 'subfolderName'], (result) => {
        const mode = result.downloadMode || 'direct';
        inputFolderName.value = result.subfolderName || '';

        cbDirect.checked = (mode === 'direct');
        cbSubfolder.checked = (mode === 'subfolder');
        cbSaveAs.checked = (mode === 'saveAs');

        updateUIState();
    });
});