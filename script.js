const fileInput = document.getElementById('fileInput');
const singleXslInput = document.getElementById('singleXslInput');
const dropZone = document.getElementById('dropZone');
const message = document.getElementById('message');
const tabSection = document.getElementById('tabSection');
const tabs = document.getElementById('tabs');
const viewerBody = document.getElementById('viewerBody');

let pairedDocuments = [];
let activeIndex = -1;
let pendingXslTargetIndex = -1;

initialize();

function initialize() {
  fileInput.addEventListener('change', handleFileSelect);
  singleXslInput.addEventListener('change', handleManualXslSelect);

  dropZone.addEventListener('dragenter', handleDragEnter);
  dropZone.addEventListener('dragover', handleDragOver);
  dropZone.addEventListener('dragleave', handleDragLeave);
  dropZone.addEventListener('drop', handleDrop);

  ['dragenter', 'dragover', 'dragleave', 'drop'].forEach((eventName) => {
    window.addEventListener(eventName, preventWindowDrop, false);
  });
}

function preventWindowDrop(event) {
  event.preventDefault();
}

function handleFileSelect(event) {
  const files = Array.from(event.target.files || []);
  loadFiles(files);
}

function handleDragEnter(event) {
  event.preventDefault();
  event.stopPropagation();
  dropZone.classList.add('is-dragover');
}

function handleDragOver(event) {
  event.preventDefault();
  event.stopPropagation();
  dropZone.classList.add('is-dragover');
}

function handleDragLeave(event) {
  event.preventDefault();
  event.stopPropagation();

  if (!dropZone.contains(event.relatedTarget)) {
    dropZone.classList.remove('is-dragover');
  }
}

function handleDrop(event) {
  event.preventDefault();
  event.stopPropagation();
  dropZone.classList.remove('is-dragover');

  const files = Array.from(event.dataTransfer.files || []);
  loadFiles(files);
}

function loadFiles(files) {
  if (files.length === 0) {
    showMessage('ファイルが選択されていません。');
    return;
  }

  try {
    buildPairsFromFiles(files);

    if (pairedDocuments.length === 0) {
      tabs.innerHTML = '';
      tabSection.classList.add('is-hidden');
      viewerBody.innerHTML = `
        <p class="error-text">
          XMLファイルが見つかりませんでした。<br>
          XMLファイルとXSLファイルを選択してください。
        </p>
      `;
      showMessage('XMLファイルとXSLファイルを選択してください。');
      return;
    }

    renderTabs();
    switchTab(0);
    showMessage(`${pairedDocuments.length}件のXMLを読み込みました。`);
  } catch (error) {
    tabs.innerHTML = '';
    tabSection.classList.add('is-hidden');
    viewerBody.innerHTML = '<p class="error-text">ファイルの読み込みに失敗しました。</p>';
    showMessage('ファイルの解析に失敗しました。');
  }
}

function buildPairsFromFiles(files) {
  const xmlMap = new Map();
  const xslMap = new Map();

  files.forEach((file) => {
    const lowerName = file.name.toLowerCase();

    if (lowerName.endsWith('.xml')) {
      const baseName = getBaseName(file.name);
      xmlMap.set(baseName, file);
    } else if (lowerName.endsWith('.xsl') || lowerName.endsWith('.xslt')) {
      const baseName = getBaseName(file.name);
      xslMap.set(baseName, file);
    }
  });

  const sortedBaseNames = Array.from(xmlMap.keys()).sort((a, b) =>
    a.localeCompare(b, 'ja')
  );

  pairedDocuments = sortedBaseNames.map((baseName) => ({
    baseName,
    xmlFile: xmlMap.get(baseName),
    xslFile: xslMap.get(baseName) || null,
    xmlText: null,
    xslText: null
  }));

  activeIndex = -1;
}

function getBaseName(fileName) {
  return fileName.replace(/\.[^/.]+$/, '');
}

function renderTabs() {
  tabs.innerHTML = '';

  pairedDocuments.forEach((item, index) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'tab-button';
    button.textContent = item.baseName;
    button.addEventListener('click', () => switchTab(index));
    tabs.appendChild(button);
  });

  tabSection.classList.remove('is-hidden');
}

async function switchTab(index) {
  activeIndex = index;
  updateActiveTabUi();

  const target = pairedDocuments[index];
  if (!target) {
    viewerBody.textContent = '表示対象がありません。';
    return;
  }

  viewerBody.textContent = '読み込み中...';

  try {
    if (!target.xmlText) {
      target.xmlText = await readFileText(target.xmlFile);
    }

    if (target.xslFile && !target.xslText) {
      target.xslText = await readFileText(target.xslFile);
    }

    if (target.xslText) {
      renderTransformedXml(target.xmlText, target.xslText);
    } else {
      renderMissingXslUi(target);
    }
  } catch (error) {
    viewerBody.innerHTML = '<p class="error-text">表示に失敗しました。</p>';
  }
}

function updateActiveTabUi() {
  const tabButtons = tabs.querySelectorAll('.tab-button');

  tabButtons.forEach((button, index) => {
    button.classList.toggle('is-active', index === activeIndex);
  });
}

function renderMissingXslUi(target) {
  viewerBody.innerHTML = '';

  const note = document.createElement('p');
  note.className = 'viewer-note';
  note.innerHTML = `
    対応するXSLファイルが見つかりません。<br>
    XSLファイルを選択するか、<br>
    XMLをそのまま表示することができます。
  `;

  const actions = document.createElement('div');
  actions.className = 'viewer-actions';

  const selectXslButton = document.createElement('button');
  selectXslButton.type = 'button';
  selectXslButton.className = 'action-button';
  selectXslButton.textContent = 'XSLファイルを選択';
  selectXslButton.addEventListener('click', () => {
    pendingXslTargetIndex = activeIndex;
    singleXslInput.value = '';
    singleXslInput.click();
  });

  const showXmlButton = document.createElement('button');
  showXmlButton.type = 'button';
  showXmlButton.className = 'action-button';
  showXmlButton.textContent = 'XMLをそのまま表示';
  showXmlButton.addEventListener('click', () => {
    renderRawXml(target.xmlText);
  });

  actions.appendChild(selectXslButton);
  actions.appendChild(showXmlButton);

  viewerBody.appendChild(note);
  viewerBody.appendChild(actions);
}

async function handleManualXslSelect(event) {
  const file = event.target.files[0];
  if (!file) {
    return;
  }

  if (pendingXslTargetIndex < 0 || !pairedDocuments[pendingXslTargetIndex]) {
    showMessage('XSLを適用する対象XMLが見つかりません。');
    return;
  }

  try {
    const xslText = await readFileText(file);
    const target = pairedDocuments[pendingXslTargetIndex];

    target.xslFile = file;
    target.xslText = xslText;

    if (!target.xmlText) {
      target.xmlText = await readFileText(target.xmlFile);
    }

    if (pendingXslTargetIndex === activeIndex) {
      renderTransformedXml(target.xmlText, target.xslText);
    }

    showMessage(`${target.baseName} にXSLファイルを適用しました。`);
  } catch (error) {
    showMessage('XSLファイルの読み込みに失敗しました。');
  } finally {
    pendingXslTargetIndex = -1;
  }
}

function renderTransformedXml(xmlText, xslText) {
  try {
    const xmlDoc = parseXml(xmlText);
    const xslDoc = parseXml(xslText);
    const resultNode = transformXml(xmlDoc, xslDoc);

    viewerBody.innerHTML = '';
    viewerBody.appendChild(resultNode);
  } catch (error) {
    viewerBody.innerHTML = '<p class="error-text">XSL変換に失敗しました。</p>';
  }
}

function renderRawXml(xmlText) {
  viewerBody.innerHTML = '';

  const pre = document.createElement('pre');
  pre.textContent = xmlText;

  viewerBody.appendChild(pre);
}

function readFileText(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (event) => resolve(event.target.result);
    reader.onerror = () => reject(new Error('Read error'));

    reader.readAsText(file, 'UTF-8');
  });
}

function parseXml(xmlText) {
  const parser = new DOMParser();
  const doc = parser.parseFromString(xmlText, 'application/xml');
  const parseError = doc.getElementsByTagName('parsererror');

  if (parseError.length > 0) {
    throw new Error('Invalid XML');
  }

  return doc;
}

function transformXml(xmlDoc, xslDoc) {
  const processor = new XSLTProcessor();
  processor.importStylesheet(xslDoc);

  const fragment = processor.transformToFragment(xmlDoc, document);
  const wrapper = document.createElement('div');
  wrapper.appendChild(fragment);

  return wrapper;
}

function showMessage(text) {
  message.textContent = text;
}