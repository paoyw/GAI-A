document.addEventListener('DOMContentLoaded', () => {
  loadSteps();
  
  // Add event listener for sidebar links
  const sidebarLinks = document.querySelectorAll('.sidebar a');
  sidebarLinks.forEach(link => {
    link.addEventListener('click', e => {
      e.preventDefault();
      console.log(e.target.getAttribute('href'));
      const stepId = e.target.getAttribute('href').slice(1); // Remove '#'
      document.getElementById(stepId).scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  });
  
  // Add scroll event listener to apply 'inactive' class dynamically
  const steps = document.getElementsByClassName('step');
  window.addEventListener('scroll', () => {
    console.log(steps);
    let matched = 0;
    for (let step of steps){
      console.log("step-");
      const stepTop = step.getBoundingClientRect().top;
      const stepBottom = step.getBoundingClientRect().bottom;
      console.log(stepTop, stepBottom, (window.innerHeight))
      if (stepTop <= (window.innerHeight / 2) && (window.innerHeight / 2) <= stepBottom){
      // if (stepTop >= 0 && stepTop <= window.innerHeight * 0.5 && matched != 1) {
        // focus on stepX
        document.getElementById("tag-" + step.id).classList.add('active-tag');
        step.classList.remove('inactive');
        console.log("tag-" + step.id);
        matched = 1;
        if (step.id == "step2"){
          const step1_outputs = document.getElementById("sentences-container");
          document.getElementById("step2-text").innerHTML = "";
          for (const child of step1_outputs.children) {
            const clone = child.cloneNode(true);
            clone.querySelector(".sentence-content").querySelector(".content").setAttribute("contenteditable", "false");
            document.getElementById("step2-text").appendChild(clone);
            // console.log(child.tagName);
          }
        }

      } else {
        document.getElementById("tag-" + step.id).classList.remove('active-tag');
        console.log("remove: tag-" + step.id);
        step.classList.add('inactive');
      }
    };
  });
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
  
