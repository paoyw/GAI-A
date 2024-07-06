  // Function to handle adding a sentence block with an index
function addSentenceBlock(sentence, index) {
  // <li class="sentence-block">
  //     <span class="sentence-index" style="background-color:gray;"></span>
  //     <div class="sentence-content">
  //       <span class="content" >text2</span>
  //       <span class="close-icon">×</span>
  //     </div>
  //   </li>
  const listItem = document.createElement('li');
  listItem.classList.add('sentence-block');
  listItem.style.animation = "extend 0.5s ease"
    const indexSpan = document.createElement('div');
    indexSpan.classList.add('sentence-index');
    // indexSpan.textContent = index + 1;
    listItem.appendChild(indexSpan);

    const sentence_content = document.createElement('div');
    sentence_content.classList.add('sentence-content');
    listItem.appendChild(sentence_content);

      const content = document.createElement('span');
      content.classList.add('content');
      content.contentEditable = true;
      content.textContent = sentence;
      sentence_content.appendChild(content);

      const closeButton = document.createElement('span');
      closeButton.classList.add('close-icon');
      closeButton.innerHTML = '&times;';
      closeButton.onclick = function() {
        listItem.remove();
        updateIndices();
      };
      sentence_content.appendChild(closeButton);

  document.getElementById('sentences-container').appendChild(listItem);
}

// Function to update indices of sentence blocks
function updateIndices() {
  const blocks = document.querySelectorAll('.sentence-block .sentence-index');
  blocks.forEach((block, index) => {
    // block.textContent = index + 1;
  });
}

// Function to add a new sentence manually
function addNewSentence() {
  const newSentence = document.getElementById('add-sentence-content').value;
  if (newSentence) {
    const index = document.querySelectorAll('.sentence-block').length - 1;
    addSentenceBlock(newSentence, index);
  }
}

// Function to call Model1 and handle response
async function callModel1() {
  
  const loading = document.createElement('div');
  loading.classList.add('donut');
  document.getElementById('step1-output-block').appendChild(loading);
  
  const userInput = document.getElementById('user-input').value;
  const response = await fetch('/api/model1', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text: userInput })
  });
  // await sleep(1000);
  function sleep(duration) {
    return new Promise((resolve) => setTimeout(resolve, duration));
  }
  const data = await response.json();
  // Clear previous blocks
  document.getElementById('step1-output-block').removeChild(loading);
  document.getElementById('sentences-container').innerHTML = '';
  
  // Display each sentence as a block with an index
  let index = 0;
  for (sentence of data.output){
    addSentenceBlock(sentence, index);
    console.log(index);
    await sleep(100);
    index += 1;
  }
  // TODO: I am not sure: is it need to be deleted before we create a new one? 
  new Sortable(document.getElementById('sentences-container'), {
    animation: 150,
    onEnd: updateIndices
  });
  document.getElementById('add-sentence').style.display = "flex";
  document.getElementById('add-sentence-button').addEventListener('click', addNewSentence);
}

