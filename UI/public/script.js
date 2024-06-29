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

// // Function to display images from the API response
// function displayImages(images) {
//   const outputContainer = document.getElementById('output-container');
//   outputContainer.innerHTML = ''; // Clear any existing images

//   images.forEach(base64Image => {
//     const imgElement = document.createElement('img');
//     imgElement.src = `data:image/jpeg;base64,${base64Image}`;
//     imgElement.classList.add('output-image');
//     outputContainer.appendChild(imgElement);
//   });
// }

// Function to collect all images and submit them to the server
async function callModel2() {
  const formData = new FormData();

  // Get all images from the preview list
  const previewList = document.getElementById('image-preview-list');
  const images = previewList.querySelectorAll('.preview-image');
  
  images.forEach((img, index) => {
    const dataURL = img.src;
    const blob = dataURLtoBlob(dataURL);
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
    
    // Display the images returned by the API
    displayImages(data.images);
    
  } catch (error) {
    console.error('There was a problem with the fetch operation:', error);
  }
}

let draggedElement = null;

function handleDragStart(event) {
  draggedElement = this;
  event.dataTransfer.effectAllowed = 'move';
  this.classList.add('dragging');
}

function handleDragOver(event) {
  event.preventDefault();
  event.dataTransfer.dropEffect = 'move';
  const target = this;

  if (draggedElement !== target) {
    const container = target.parentNode;
    const children = Array.from(container.children);
    const draggedIndex = children.indexOf(draggedElement);
    const targetIndex = children.indexOf(target);

    if (draggedIndex < targetIndex) {
      container.insertBefore(draggedElement, target.nextSibling);
    } else {
      container.insertBefore(draggedElement, target);
    }

    children.forEach(child => {
      if (child !== draggedElement) {
        child.style.transition = 'transform 0.3s ease';
      }
    });

  }
}

function handleDrop(event) {
  event.preventDefault();
  if (draggedElement) {
    draggedElement.classList.remove('dragging');
    draggedElement = null;
  }
  updateOrder();
}

function displayImages(images) {
  const outputContainer = document.getElementById('output-container');
  outputContainer.innerHTML = '';

  images.forEach((base64Image, index) => {
    const imgWrapper = document.createElement('div');
    imgWrapper.classList.add('image-wrapper');
    imgWrapper.setAttribute('draggable', 'true');
    imgWrapper.dataset.index = index;

    const imgElement = document.createElement('img');
    imgElement.src = `data:image/jpeg;base64,${base64Image}`;
    imgElement.classList.add('output-image');

    const deleteButton = document.createElement('span');
    deleteButton.innerHTML = '&times;';
    deleteButton.classList.add('delete-button');
    deleteButton.onclick = () => {
      imgWrapper.remove();
      updateOrder();
    };

    imgWrapper.appendChild(imgElement);
    imgWrapper.appendChild(deleteButton);
    outputContainer.appendChild(imgWrapper);

    imgWrapper.addEventListener('dragstart', handleDragStart);
    imgWrapper.addEventListener('dragover', handleDragOver);
    imgWrapper.addEventListener('drop', handleDrop);
  });

  updateOrder();
}

function updateOrder() {
  const wrappers = document.querySelectorAll('.image-wrapper');
  wrappers.forEach((wrapper, index) => {
    wrapper.dataset.index = index;
  });
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
  