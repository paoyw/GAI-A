  // Function to handle adding a sentence block with an index
function addSentenceBlock(sentence, index) {
  const listItem = document.createElement('li');
  listItem.classList.add('sentence-block');
  
  const indexSpan = document.createElement('span');
  indexSpan.classList.add('sentence-index');
  indexSpan.textContent = index + 1;
  listItem.appendChild(indexSpan);

  const content = document.createElement('div');
  content.classList.add('content');
  content.contentEditable = true;
  content.textContent = sentence;
  listItem.appendChild(content);

  const closeButton = document.createElement('span');
  closeButton.classList.add('close-icon');
  closeButton.innerHTML = '&times;';
  closeButton.onclick = function() {
    listItem.remove();
    updateIndices();
  };
  listItem.appendChild(closeButton);

  document.getElementById('sentences-container').appendChild(listItem);
}

// Function to update indices of sentence blocks
function updateIndices() {
  const blocks = document.querySelectorAll('.sentence-block .sentence-index');
  blocks.forEach((block, index) => {
    block.textContent = index + 1;
  });
}

// Function to add a new sentence manually
function addNewSentence() {
  const newSentence = document.getElementById('add-sentence-content').textContent;
  if (newSentence) {
    const index = document.querySelectorAll('.sentence-block').length - 1;
    addSentenceBlock(newSentence, index);
  }
}

// Function to call Model1 and handle response
async function callModel1() {
  const userInput = document.getElementById('user-input').value;
  const response = await fetch('/api/model1', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text: userInput })
  });
  const data = await response.json();
  
  // Clear previous blocks
  document.getElementById('sentences-container').innerHTML = '';

  // Display each sentence as a block with an index
  data.output.forEach((sentence, index) => {
    addSentenceBlock(sentence, index);
  });
  // TODO: I am not sure: is it need to be deleted before we create a new one? 
  new Sortable(document.getElementById('sentences-container'), {
    animation: 150,
    onEnd: updateIndices
  });
  document.getElementById('add-sentence').style.display = "flex";
  document.getElementById('add-sentence-button').addEventListener('click', addNewSentence);
}