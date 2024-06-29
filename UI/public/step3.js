function callModel3() {
    const images = document.querySelectorAll('.image-wrapper img');
    const formData = new FormData();
  
    images.forEach((image, index) => {
      const blob = dataURLtoBlob(image.src);
      formData.append('images', blob, `image${index}.jpg`);
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
  
  // Function to display the resulting video
  function displayVideo(videoUrl) {
    const videoContainer = document.getElementById('video-container');
    videoContainer.innerHTML = `
      <video controls>
        <source src="${videoUrl}" type="video/mp4">
        Your browser does not support the video tag.
      </video>
    `;
  }
  