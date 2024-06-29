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
