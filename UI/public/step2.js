
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
  
  function update_image_position(){
    const previewList = document.getElementById('image-preview-list');
    const wrappers = previewList.querySelectorAll('.preview-image-absolute-wrapper');
    const n = wrappers.length;
    wrappers.forEach((wrapper, index) => {
      let mid = 0.25;
      let range = 0.15;
      let value = (n == 1) ? mid : range * 2 / (n-1) * index + mid - range;
      let s = ( value * 100).toFixed(2) + '%';
      wrapper.style.left =  s;
      wrapper.style.top = s;
      console.log(index, (0.3 / n) * (index - n / 2));
    });
  }

  // Function to handle multiple image previews
  function previewImages(files) {
    const previewList = document.getElementById('image-preview-list');
    Array.from(files).forEach(file => {
      const reader = new FileReader();
  
      // <div id="image-preview-list">
      //           <div class="preview-image-absolute-wrapper" style="left: 10%; top: 10%;">
      //               <div class="preview-image-container"></div>

      reader.onload = function(e) {
        const imgContainerWrapper = document.createElement('div');
        imgContainerWrapper.classList.add('preview-image-absolute-wrapper');
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
              imgContainerWrapper.remove();
              update_image_position();
            };
    
            imgContainer.appendChild(img);
            imgContainer.appendChild(removeButton);
          imgContainerWrapper.appendChild(imgContainer);
          previewList.appendChild(imgContainerWrapper);
          update_image_position();
      };
  
      if (file) {
        reader.readAsDataURL(file);
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
  
  function allowDrop(event) {
    event.preventDefault();
    // change your color here
  }
