// Function to call model 3
async function callModel3() {
    
    // const videoContainer = document.getElementById('video-container');
    const loading = document.createElement('div');
    loading.classList.add('donut');
    document.getElementById('video-container').appendChild(loading);
    // await sleep(1000);
    function sleep(duration) {
        return new Promise((resolve) => setTimeout(resolve, duration));
    }
    document.getElementById('video-container').removeChild(loading);
    
    const images = document.querySelectorAll('.image-wrapper img');
    const formData = new FormData();
    
    images.forEach((image, index) => {
        const blob = dataURLtoBlob(image.src);
        formData.append('images', blob, `image${index}.jpg`);
        formData.append('texts', image.dataset.text);
    });
    
    fetch('/api/model3', {
        method: 'POST',
        body: formData,
    })
    .then(response => response.blob())
    .then(blob => {
        const videoUrl = URL.createObjectURL(blob);
        displayVideo(videoUrl);
    })
    .catch(error => {
        console.error('Error:', error);
    });
}

// Function to display the resulting video using Video.js
function displayVideo(videoUrl) {
  const videoContainer = document.getElementById('video-container');
  videoContainer.innerHTML = `
      <video id="my-video" class="video-js vjs-default-skin" controls preload="auto" style="border-radius: 3vh; animation: scaleup 0.5s ease;">
          <source src="${videoUrl}" type="video/mp4">
          Your browser does not support the video tag.
      </video>
  `;

  // Initialize Video.js
  videojs(document.getElementById('my-video'));
}

// Helper function to convert base64 to Blob
function dataURLtoBlob(dataURL) {
  const byteString = atob(dataURL.split(',')[1]);
  const mimeString = dataURL.split(',')[0].split(':')[1].split(';')[0];
  const ab = new ArrayBuffer(byteString.length);
  const ia = new Uint8Array(ab);

  for (let i = 0; i < byteString.length; i++) {
      ia[i] = byteString.charCodeAt(i);
  }

  return new Blob([ab], { type: mimeString });
}