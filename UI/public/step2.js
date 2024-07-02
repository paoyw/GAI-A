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

function displayImages(images) {
    const outputContainer = document.getElementById('output-container');
    outputContainer.innerHTML = '';
    outputContainer.style.padding = "1vh";
    outputContainer.style.height = "50vh";
    images.forEach((base64Image, index) => {
        const imgWrapper = document.createElement('div');
        imgWrapper.classList.add('image-wrapper');
        imgWrapper.dataset.index = index;

        const controlDiv = document.createElement('div');
        controlDiv.classList.add('control-div');

        const dragHandle = document.createElement('div');
        dragHandle.classList.add('drag-handle');

        const deleteButton = document.createElement('span');
        deleteButton.innerHTML = '&times;';
        deleteButton.classList.add('delete-button');
        deleteButton.onclick = () => {
            imgWrapper.remove();
            updateOrder();
        };

        controlDiv.appendChild(dragHandle);
        controlDiv.appendChild(deleteButton);

        const imgElement = document.createElement('img');
        imgElement.src = `data:image/jpeg;base64,${base64Image}`;
        imgElement.classList.add('output-image');

        imgWrapper.appendChild(controlDiv);
        imgWrapper.appendChild(imgElement);
        outputContainer.appendChild(imgWrapper);
    });

    // Initialize Sortable
    new Sortable(outputContainer, {
        animation: 150,
        handle: '.drag-handle',
        onEnd: updateOrder
    });

    updateOrder();
}

function updateOrder() {
    const wrappers = document.querySelectorAll('.image-wrapper');
    const n = wrappers.length;
    wrappers.forEach((wrapper, index) => {
        wrapper.dataset.index = index;
        // wrapper.style.left = index / (n-1) * 70 + 10 + '%';
    });
}