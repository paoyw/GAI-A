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

function dragFile(event) {
  event.preventDefault();
  document.body.style.backgroundColor = "lightgreen";
  const files = event.dataTransfer["files"];
  previewImages(files);
}

function clickFile(event) {
  const files = event.target.files;
  previewImages(files);
}

// Function to handle multiple image previews
function previewImages(files) {
  const previewList = document.getElementById('image-preview-list');
  Array.from(files).forEach(file => {
    const reader = new FileReader();

    reader.onload = function(e) {
      const imgContainer = document.createElement('div');
      imgContainer.classList.add('preview-image-container');

      const img = document.createElement('img');
      img.src = e.target.result;
      img.classList.add('preview-image');
      img.dataset.file = file.name;  // Store the file name for later use

      const removeButton = document.createElement('span');
      removeButton.classList.add('remove-icon');
      removeButton.innerHTML = '&times;';
      removeButton.onclick = function() {
        imgContainer.remove();
      };

      imgContainer.appendChild(img);
      imgContainer.appendChild(removeButton);
      previewList.appendChild(imgContainer);
    };

    if (file) {
      reader.readAsDataURL(file);
      event.target.value = null;
    }
  });
}

// Function to collect all images and submit them to the server
async function callModel2() {
  const formData = new FormData();

  // Get all images from the preview list
  const previewList = document.getElementById('image-preview-list');
  const images = previewList.querySelectorAll('.preview-image');
  console.log(images);
  images.forEach((img, index) => {
    // Get the data URL from the image src
    const dataURL = img.src;
    
    // Convert data URL to Blob (file object)
    const blob = dataURLtoBlob(dataURL);
    
    // Append the Blob to FormData with a unique key
    formData.append(`image_${index}`, blob, `image_${index}.png`);
  });

  try {
    const response = await fetch('/api/model2', {
      method: 'POST',
      body: formData
    });

    if (!response.ok) {
      throw new Error('Network response was not ok');
    }

    const data = await response.json();
    console.log('Server response:', data);
    
    // Handle the output from Model2...
  } catch (error) {
    console.error('There was a problem with the fetch operation:', error);
  }
}



function allowDrop(event) {
  event.preventDefault();
  // change your color here
}

// Function to convert data URL to Blob
function dataURLtoBlob(dataURL) {
  const parts = dataURL.split(';base64,');
  const contentType = parts[0].split(':')[1];
  const raw = window.atob(parts[1]);
  const rawLength = raw.length;
  const uInt8Array = new Uint8Array(rawLength);

  for (let i = 0; i < rawLength; ++i) {
    uInt8Array[i] = raw.charCodeAt(i);
  }

  return new Blob([uInt8Array], { type: contentType });
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
  