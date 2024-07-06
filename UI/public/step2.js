/* upload file */
function dragFile(event) {
    event.preventDefault();
    const files = event.dataTransfer["files"];
    previewImages(files);
}

function clickFile(event) {
    const files = event.target.files;
    previewImages(files);
}

function allowDrop(event) {
    event.preventDefault();
    // change your color here
}

/* absoulte position control */
function update_image_position(){
    const previewList = document.getElementById('image-preview-list');
    const wrappers = previewList.querySelectorAll('.preview-image-absolute-wrapper');
    const n = wrappers.length;
    wrappers.forEach((wrapper, index) => {
        let mid_w = 0.35;
        let mid_h = 0.15;
        let range = 0.10;
        let value_w = (n == 1) ? mid_w : range * 2 / (n-1) * index + mid_w - range;
        let value_h = (n == 1) ? mid_h : range * 2 / (n-1) * index + mid_h - range;
        let s_w = ( value_w * 100).toFixed(2) + '%';
        let s_h = ( value_h * 100).toFixed(2) + '%';
        wrapper.style.left = s_w;
        wrapper.style.top = s_h;
        console.log(index, (0.3 / n) * (index - n / 2));
    });
}

// Function to handle multiple image previews
function previewImages(files) {
    const previewList = document.getElementById('image-preview-list');
    Array.from(files).forEach(file => {
        const reader = new FileReader();
        reader.onload = function(e) {
            const imgContainerWrapper = document.createElement('div');
            imgContainerWrapper.classList.add('preview-image-absolute-wrapper');
                    const imgContainer = document.createElement('div');
                    imgContainer.classList.add('preview-image-container');
    
                    const img = document.createElement('img');
                    img.src = e.target.result;
                    img.classList.add('preview-image');
                    img.dataset.file = file.name;    // Store the file name for later use
        
                    const removeButton = document.createElement('span');
                    removeButton.classList.add('delete-button');
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

// Function to collect all images and submit them to the server
async function callModel2() {
    const formData = new FormData();

    // Get all images from the preview list
    const previewList = document.getElementById('image-preview-list');
    const images = previewList.querySelectorAll('.preview-image');
    
    images.forEach((img, index) => {
        const dataURL = img.src;
        const blob = dataURLtoBlob(dataURL);
        formData.append(`images`, blob, `image_${index}.png`);
    });

    const step2_texts = document.getElementById("step2-text");
    for (const child of step2_texts.children) {
        console.log(child.querySelector(".sentence-content").querySelector(".content").innerHTML);
        formData.append("texts", child.querySelector(".sentence-content").querySelector(".content").innerHTML);
        console.log(formData.getAll("texts"))
    }
    
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

async function displayImages(images) {
    const outputContainer = document.getElementById('output-container');
    outputContainer.innerHTML = ''; // Clear existing images
    outputContainer.style.height = "40vh";

    const step2_texts = document.getElementById("step2-text");
    function sleep(duration) {
        return new Promise((resolve) => setTimeout(resolve, duration));
      }
    let index = 0;
    for (base64Image of images ){
        const imgWrapper = document.createElement('div');
        imgWrapper.classList.add('image-wrapper');
        imgWrapper.dataset.index = index;

        // Create control div
        const controlDiv = document.createElement('div');
        controlDiv.classList.add('control-div');

        // Create drag handle
        const dragHandle = document.createElement('div');
        dragHandle.classList.add('drag-handle');
        // dragHandle.innerHTML = ':::'; // Drag handle symbol

        // Create delete button
        const deleteButton = document.createElement('span');
        deleteButton.innerHTML = '&times;';
        deleteButton.classList.add('delete-button');
        deleteButton.onclick = () => {
            imgWrapper.remove();
            updateOrder();
        };

        // Append drag handle and delete button to control div
        controlDiv.appendChild(dragHandle);
        controlDiv.appendChild(deleteButton);

        // Create image element
        const imgElement = document.createElement('img');
        imgElement.src = `data:image/jpeg;base64,${base64Image}`;
        imgElement.classList.add('output-image');
        console.log(index, step2_texts.children[index]?.querySelector(".sentence-content .content").innerHTML);
        imgElement.dataset.text = step2_texts.children[index]?.querySelector(".sentence-content .content").innerHTML || '';

        // Append control div and image to image wrapper
        imgWrapper.appendChild(controlDiv);
        imgWrapper.appendChild(imgElement);

        // Append image wrapper to output container
        outputContainer.appendChild(imgWrapper);
        // Create image wrapper
        index += 1;
        await sleep(100);
    };

    // Initialize Sortable
    new Sortable(outputContainer, {
        animation: 150,
        // handle: '.drag-handle',
        onEnd: updateOrder
    });

    updateOrder();
}

function updateOrder() {
    const wrappers = document.querySelectorAll('.image-wrapper');
    wrappers.forEach((wrapper, index) => {
        wrapper.dataset.index = index;

    });
}