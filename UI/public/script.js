document.addEventListener('DOMContentLoaded', () => {
  loadSteps();
  // Initialize SortableJS
  const steps = document.querySelectorAll('.step');
  const sidebarLinks = document.querySelectorAll('.sidebar a');

  // Add event listener for sidebar links
  sidebarLinks.forEach(link => {
    link.addEventListener('click', e => {
      e.preventDefault();
      const stepId = e.target.getAttribute('href').slice(1); // Remove '#'
      focusStep(stepId);
    });
  });

  // Add scroll event listener to apply 'inactive' class dynamically
  window.addEventListener('scroll', () => {
    steps.forEach(step => {
      const stepTop = step.getBoundingClientRect().top;
      if (stepTop >= 0 && stepTop <= window.innerHeight * 0.5) {
        step.classList.remove('inactive');
      } else {
        step.classList.add('inactive');
      }
    });
  });

  // Function to focus on a specific step
  function focusStep(stepId) {
    steps.forEach(step => {
      if (step.id === stepId) {
        step.classList.remove('inactive');
        document.getElementById(stepId).scrollIntoView({ behavior: 'smooth', block: 'start' });
      } else {
        step.classList.add('inactive');
      }
    });
  }
});

async function loadSteps() {
  try {
    let pages = "";
    for (let stepName of ['step0', 'step1', 'step2', 'step3']) {
      const response = await fetch(`${stepName}.html`);
      const html = await response.text();
      console.log(response);
      pages += html;
    }
    document.getElementById('content').innerHTML = pages ;
  } catch (error) {
    console.error('Error loading step:', error);
  }
}


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
  
  async function callModel2() {
    const model1Output = document.getElementById('model1-output').innerText;
    const productImage = document.getElementById('product-image').files[0];
  
    const formData = new FormData();
    formData.append('texts', model1Output);
    formData.append('image', productImage);
  
    const response = await fetch('/api/model2', {
      method: 'POST',
      body: formData
    });
    const data = await response.json();
    document.getElementById('model2-output').innerText = JSON.stringify(data.output);
  }
  
  async function callModel3() {
    const model2Output = document.getElementById('model2-output').innerText;
    const response = await fetch('/api/model3', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ images: model2Output })
    });
    const data = await response.json();
    document.getElementById('model3-output').innerText = JSON.stringify(data.output);
  }
  