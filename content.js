
// Initialize global state
let workflowCancelled = false;
const PK = getPkFromUrl(window.location.href);
let currentOpenPanel = null;
let currentWorkflowPromise = null;
let isObservingNavigateModal = false;
let isHandlingNavigateWorkflow = false;

// Initialize global testing object
let userTestingObj = {
  result:{
    object:" ",
    predicate:" ",
    ARA:" ",
    QA:" ",
    novelty:" ",
    success:" ",
    reasoning:" ",
    datasource:" ",
    datavalueNeed:" ",
    datavalueUniqueness:" ",
    flags:[]
  },
  session:{
    timestamp: Date.now(),
    query:{
      pk: PK
    },
    sessionSuccess: " ",
    NPS: " "
  }
};

function getPkFromUrl(url) {
  try {
    const parsedUrl = new URL(url);
    const params = new URLSearchParams(parsedUrl.search);
    return params.get('q'); // returns the value after q=
  } catch (e) {
    return null; // In case of an invalid URL
  }
}

function resetUserTestingObj() {
  userTestingObj = {
    result:{
      object:" ",
      predicate:" ",
      QA:" ",
      novelty:" ",
      success:" ",
      reasoning:" ",
      datasource:" ",
      datavalueNeed:" ",
      datavalueUniqueness:" ",
      flags:[]
    },
    session:{
      timestamp: Date.now(),
      query:{
        pk: PK
      },
      sessionSuccess: " ",
      NPS: " "
    }
  };
}


function sendToGoogleForm(obj) {
  // Safety check - if obj is undefined, use the global userTestingObj
  const testingObj = obj || userTestingObj;
  
  // If still no valid object, initialize a new one
  if (!testingObj || !testingObj.result || !testingObj.session) {
    console.error('Invalid testing object, initializing new one');
    resetUserTestingObj();
    return;
  }

  console.log('Sending to Google Form:', testingObj);
  const formUrl = 'https://docs.google.com/forms/u/0/d/e/1FAIpQLScFrEtToJT97jeUZ-9fUJil9kqwK7EzLGokj7E3nTJCx9WvGQ/formResponse';
  
  // Replace these with your actual entry IDs!
  const formData = new URLSearchParams();
  formData.append('entry.2101973845', testingObj.session.ARA || " ");
  formData.append('entry.1142791448', testingObj.result.object || " ");
  formData.append('entry.455615436', testingObj.result.predicate || " ");
  formData.append('entry.1703541576', testingObj.result.QA || " ");
  formData.append('entry.652081313', testingObj.result.novelty || " ");
  formData.append('entry.1262337293', testingObj.result.success || " ");
  formData.append('entry.1304457557', testingObj.result.reasoning || " ");
  formData.append('entry.17482856', testingObj.result.datasource || " ");
  formData.append('entry.1912985814', testingObj.result.datavalueNeed || " ");
  formData.append('entry.1319177885', testingObj.result.datavalueUniqueness || " ");
  formData.append('entry.1022165891', testingObj.session.timestamp || Date.now());
  formData.append('entry.1257738886', testingObj.session.query.pk || PK);
  formData.append('entry.52800901', JSON.stringify(testingObj.result.flags || [])); // flags as JSON
  formData.append('entry.875801026', testingObj.session.sessionSuccess || " ");
  formData.append('entry.764010696', testingObj.session.NPS || " ");

  fetch(formUrl, {
    method: 'POST',
    mode: 'no-cors',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body: formData
  });
  
  // Reset the testing object after sending
  resetUserTestingObj();

}



function printAndClearTestingObject() {
  console.log('Testing object:', userTestingObj);
  closeAllPopups()
  sendToGoogleForm(userTestingObj)
  resetUserTestingObj()

}

function updateResultUserTestingFields(field, value) {
  if ('result' in userTestingObj) {
     if (field in userTestingObj.result) {
      if (field === "flags"){
        userTestingObj.result[field].push(value);
      }else{
      userTestingObj.result[field] = value;
      }
     }
  }
}


function closeAllPopups() {
  document.querySelectorAll('[id$="-popup"]').forEach(popup => popup.remove());
}

function isValidURL(str) {
  try {
    new URL(str);
    return true;
  } catch (e) {
    return false;
  }
}

function setAriaHiddenRecursively(element) {
  if (!element) return;
  element.setAttribute('aria-hidden', 'true');
  Array.from(element.children).forEach(child => setAriaHiddenRecursively(child));
}


function closePanel(panel) {
  console.log('Closing panel:', panel);
  if (!panel) {
    console.warn('Attempted to close null or undefined panel');
    return;
  }
  console.log('closing Panel');
  setAriaHiddenRecursively(panel);
  console.log('Panel aria-hidden set to true:', panel);

  // Replace '_open_' with '_closed_'
  const elements = panel.querySelectorAll('[class*="_open_"]');
  console.log('Found open buttons:', elements);
  elements.forEach(element => {
    let newclassName = element.className.replace(/_open_/g, '_closed_');  
    if (newclassName !== element.className) {
      element.className = newClassName;
    }
  });

  // Replace '-auto _' with '-zero _'
  const autoelements = panel.querySelectorAll('[class*="-auto _"]');
  autoelements.forEach(element => {
    let newclassName = element.className.replace(/-auto _/g, '-zero _');
    console.log('Updating class from', element.className, 'to', newclassName);
    if (newclassName !== element.className) {
      element.className = newClassName;
    }
  });

  console.log('Classes updated:', panel);

  // // Force close by simulating click on the close button if available
  // const closeButton = panel.querySelector('button[aria-label="Close"]');
  // if (closeButton) {
  //   console.log('Found close button, simulating click');
  //   closeButton.click();
  // }
}


function waitForPanelClose(panel) {
  console.log('waitForPanelClose started for panel:', panel); 
  return new Promise(resolve => {
    if (panel.getAttribute('aria-hidden') === 'true') {
      console.log("Panel already closed at start");
      resolve();
      return;
    }
    const observer = new MutationObserver(mutations => {
      mutations.forEach(mutation => {
        console.log("Mutation observed:", mutation);
        if (
          mutation.attributeName === 'aria-hidden' &&
          panel.getAttribute('aria-hidden') === 'true'
        ) {
          observer.disconnect();
          resolve();
        }
      });
    });
    observer.observe(panel, { attributes: true, attributeFilter: ['aria-hidden'] });
  });
}

async function collectFeedbackPanel(panel) {
  console.log('collectFeedbackPanel started');
  
  // Clean up any existing workflow first
  if (currentWorkflowPromise) {
    console.log('Cancelling existing workflow');
    workflowCancelled = true;
    await currentWorkflowPromise;
    // Send data for cancelled workflow
    printAndClearTestingObject();
  }
  
  // Always clean up any existing popups
  closeAllPopups();
  
  // Clean up previous panel if it exists
  if (currentOpenPanel && currentOpenPanel !== panel) {
    console.log('Cleaning up previous panel:', currentOpenPanel);
    try {
      closePanel(currentOpenPanel);
      // Wait a moment to ensure the panel starts closing
      await new Promise(resolve => setTimeout(resolve, 100));
      if (currentOpenPanel.getAttribute('aria-hidden') !== 'true') {
        console.warn('Panel did not close properly, forcing close');
        currentOpenPanel.setAttribute('aria-hidden', 'true');
      }
    } catch (e) {
      console.error('Error closing previous panel:', e);
    }
    currentOpenPanel = null;
  }
  
  // Start fresh with new testing object
  resetUserTestingObj();
  console.log('Testing object reset');
  
  // Start feedback processes
  const object = extractNodeIdFromTableItem(panel);
  const predicate = extractPredicateIdFromTableItem(panel);
  const ara = extractARAFromTableItem(panel);
  console.log('Extracted IDs:', { object, predicate });
  updateResultUserTestingFields('object', object);
  updateResultUserTestingFields('predicate', predicate);
  updateResultUserTestingFields('ARA', ara);  
  
  try {
    console.log('Starting workflow for panel');
    const result = await runPopupWorkflow(panel);
    console.log('Workflow completed with result:', result);
    
    // if (result !== 'cancelled') {
    printAndClearTestingObject();
    await waitForPanelClose(panel);
    // }
  } catch (e) {
    console.error('Error in feedback workflow:', e);
  } finally {
    // Always ensure popups are cleaned up
    closeAllPopups();
  }
}

async function collectNavigateAwayPanel(panel) {
  console.log('entered collectNavigateAwayPanel');
  resetUserTestingObj();
  
  try {
    const result = await runNavigateAwayWorkflow(panel);
    
    if (result && result !== 'cancelled' && result !== 'closed') {
      // Update the testing object with the feedback
      if (result.sessionSuccess !== undefined) {
        updateResultUserTestingFields('sessionSuccess', result.sessionSuccess);
      }
      if (result.NPS !== undefined) {
        updateResultUserTestingFields('NPS', result.NPS);
      }
    }
  } catch (error) {
    console.error('Error in navigate away workflow:', error);
  } finally {
    // Always clean up
    printAndClearTestingObject();
    closeAllPopups();
  }
}



async function runPopupWorkflow(panel) {
  console.log('Starting runPopupWorkflow');
  workflowCancelled = false;

  // Promise that resolves when the panel is closed
  const panelClosedPromise = new Promise(resolve => {
    const panelObserver = new MutationObserver(mutations => {
      mutations.forEach(mutation => {
        if (
          mutation.attributeName === 'aria-hidden' &&
          panel.getAttribute('aria-hidden') === 'true'
        ) {
          console.log('Panel closed during workflow');
          workflowCancelled = true;
          closeAllPopups();
          panelObserver.disconnect();
          resolve('cancelled');
        }
      });
    });
    panelObserver.observe(panel, { attributes: true, attributeFilter: ['aria-hidden'] });
  });

  // Helper function to check if workflow should continue
  const shouldContinue = () => {
    if (workflowCancelled) {
      console.log('Workflow cancelled, cleaning up');
      closeAllPopups();
      return false;
    }
    return true;
  };

  // Helper to race workflow steps against panel close
  async function raceStep(popupName) {
    console.log(`Starting raceStep for ${popupName}`);
    if (workflowCancelled) {
      console.log('Workflow cancelled before starting popup');
      return 'cancelled';
    }
    
    try {
      console.log(`Injecting popup: ${popupName}`);
      const result = await Promise.race([
        injectPopup(popupName).catch(error => {
          console.error(`Error injecting popup ${popupName}:`, error);
          return 'cancelled';
        }),
        panelClosedPromise
      ]);
      console.log(`Popup ${popupName} result:`, result);
      return result;
    } catch (error) {
      console.error(`Error in raceStep for ${popupName}:`, error);
      return 'cancelled';
    }
  }

  // Helper to create and inject popups
  async function injectPopup(type) {
    // Remove any existing popup of this type
    let oldPopup = document.getElementById(`${type}-popup`);
    if (oldPopup) oldPopup.remove();

    // Check for Chrome runtime first
    if (!chrome?.runtime?.getURL) {
      console.error('Chrome runtime not available');
      return Promise.reject(new Error('Chrome runtime not available'));
    }

    return fetch(chrome.runtime.getURL(`${type}.html`))
      .then(response => response.text())
      .then(html => {
        return new Promise((resolve) => {
          let popup = document.createElement('div');
          popup.id = `${type}-popup`;
          popup.innerHTML = html;
          popup.style.position = 'fixed';
          popup.style.right = '0';
          popup.style.bottom = '0';
          popup.style.width = 'fit-content';
          popup.style.background = 'white';
          popup.style.padding = '20px';
          popup.style.borderRadius = '8px';
          popup.style.boxShadow = '0 4px 8px rgba(0, 0, 0, 0.2)';
          popup.style.fontSize = '14px';
          popup.style.height = 'auto';
          popup.style.margin = '0 40px 40px 0';

          document.body.appendChild(popup);

          let resolved = false; // To prevent double resolve

          // ---- Move close button logic here, after popup is created ----
          const closeBtn = popup.querySelector('.popup-close');
          if (closeBtn) {
            closeBtn.addEventListener('click', function() {
              popup.remove();
              resolved = true;
              resolve('__CANCEL__'); // Use a special token to detect cancellation
            });
          }
          // -------------------------------------------------------------

          if (type === "datasource") {
            popup.querySelector('#datasource-form').addEventListener('submit', function(e) {
              e.preventDefault();
              const url = popup.querySelector('#datasource-url').value.trim();
              const errorDiv = popup.querySelector('#datasource-error');
              if (!url) {
                errorDiv.textContent = "Please enter a URL.";
                updateResultUserTestingFields(type, null);
                popup.remove();
                resolved = true;
                resolve(null);
                return;
              }
              if (!isValidURL(url)) {
                errorDiv.textContent = "Invalid URL. Please enter a valid URL (e.g., https://example.com).";
                updateResultUserTestingFields(type, null);
                popup.remove();
                resolved = true;
                resolve(null);
                return;
              }
              errorDiv.textContent = "";
              updateResultUserTestingFields(type, url);
              popup.remove();
              resolved = true;
              resolve(url);
            });
          }
          else {
            // Add click event listeners to all .{type}-btn buttons
            popup.querySelectorAll(`.${type}-btn`).forEach(btn => {
              btn.addEventListener('click', function(e) {
                e.preventDefault();
                if (resolved) return; // Prevent double execution
                popup.querySelectorAll(`.${type}-btn`).forEach(b => b.classList.remove('selected'));
                btn.classList.add('selected');
                let feedback = btn.getAttribute('data-score');
                // Try to cast to int if possible
                if (!isNaN(feedback)) feedback = parseInt(feedback, 10);
                updateResultUserTestingFields(type, feedback);
                console.log('Feedback collected for', type, ':', feedback); 
                popup.remove();
                resolved = true;
                resolve(feedback);
              });
            });
          }
        });
      });
  }

  // Helper to race workflow steps against panel close
  async function raceStep(popupName) {
    console.log(`Starting raceStep for ${popupName}`);
    if (workflowCancelled) {
      console.log('Workflow cancelled before starting popup');
      return 'cancelled';
    }
    
    try {
      console.log(`Injecting popup: ${popupName}`);
      const result = await Promise.race([
        injectPopup(popupName).catch(error => {
          console.error(`Error injecting popup ${popupName}:`, error);
          return 'cancelled';
        }),
        panelClosedPromise
      ]);
      console.log(`Popup ${popupName} result:`, result);
      return result;
    } catch (error) {
      console.error(`Error in raceStep for ${popupName}:`, error);
      return 'cancelled';
    }
  }

  // --- Workflow steps ---
  console.log('Starting QA popup');
  let qaFeedback = await raceStep('QA');
  if (!shouldContinue() || qaFeedback === '__CANCEL__' || qaFeedback === 'cancelled') {
    return 'cancelled';
  }

  if (qaFeedback === 0) {
    return 'completed';
  } else if (qaFeedback === 10) {
    console.log('Starting novelty popup');
    let noveltyFeedback = await raceStep('novelty');
    console.log('novelty feedback: ', noveltyFeedback);
    if (!shouldContinue() || noveltyFeedback === '__CANCEL__' || noveltyFeedback === 'cancelled') {
      return 'cancelled';
    }
    if (noveltyFeedback === 1) {
      if (!shouldContinue()) return 'cancelled';
      console.log('Starting success popup');
      let successFeedback = await raceStep('success');
      console.log('succcess feedback: ', successFeedback);
    }
    return 'completed';
  } else {
    console.log('Starting reasoning popup');
    let reasoningFeedback = await raceStep('reasoning');
    console.log('reasoning feedback: ', reasoningFeedback);
    if (!shouldContinue() || reasoningFeedback === '__CANCEL__' || reasoningFeedback === 'cancelled') {
      return 'cancelled';
    }
    if (reasoningFeedback === 0) {
      if (!shouldContinue()) return 'cancelled';
      console.log('Starting datasource popup');
      let datasource = await raceStep('datasource');
      console.log('datasource feedback collected',datasource);
      
      if (!shouldContinue()) return 'cancelled';
      console.log('Starting datavalue need popup');
      let datavalueNeed = await raceStep('datavalueNeed');
      console.log('datavalueNeed feedback: ', datavalueNeed);
      
      if (!shouldContinue()) return 'cancelled';
      console.log('Starting datavalue uniqueness popup');
      let datavalueUniqueness = await raceStep('datavalueUniqueness');
      console.log('datavalueUniqueness feedback: ', datavalueUniqueness);
    }
    return 'completed';
  }
  }


async function runNavigateAwayWorkflow(navigateAwayPanel) {
  console.log('entered runNavigateAwayWorkflow');
  let workflowCancelled = false;

  // Create a promise that resolves when the modal is closed
  const modalClosePromise = new Promise(resolve => {
    const observer = new MutationObserver(mutations => {
      for (const mutation of mutations) {
        if (mutation.type === 'attributes' && 
            mutation.attributeName === 'class' && 
            !navigateAwayPanel.className.includes('_true_1kx79_25')) {
          observer.disconnect();
          workflowCancelled = true;
          resolve('closed');
          break;
        }
      }
    });

    observer.observe(navigateAwayPanel, {
      attributes: true,
      attributeFilter: ['class']
    });
  });

  try {
    // Show both popups at the same time
    console.log('Showing both popups');
    const [sessionSuccessResult, NPSResult] = await Promise.all([
      injectSessionFeedback('sessionSuccess'),
      injectSessionFeedback('NPS')
    ]);
    
    console.log('sessionSuccess result:', sessionSuccessResult);
    console.log('NPS result:', NPSResult);
    
    if (workflowCancelled || 
        sessionSuccessResult === 'closed' || 
        sessionSuccessResult === '__CANCEL__' ||
        NPSResult === 'closed' || 
        NPSResult === '__CANCEL__') {
      console.log('One of the popups was cancelled or closed');
      return 'cancelled';
    }

    if (workflowCancelled || 
        NPSResult === 'closed' || 
        NPSResult === '__CANCEL__') {
      console.log('NPS popup was cancelled or closed');
      return 'cancelled';
    }

    // Return both results if we got here
    return {
      sessionSuccess: sessionSuccessResult,
      NPS: NPSResult
    };

  } catch (error) {
    console.error('Error in navigate away workflow:', error);
    return 'cancelled';
  } finally {
    // Clean up
    if (!workflowCancelled) {
      closeAllPopups();
    }
  }
}

async function injectSessionFeedback(type) {
  return new Promise((resolve) => {
    try {
      const navigateAwayModal = document.querySelector('[data-testid="navconf-modal"]');
      console.log('navigateAwayModal:', navigateAwayModal);
      if (!navigateAwayModal) {
        console.error('Cannot find the nav-confirmation modal node');
        return resolve('__CANCEL__');
      }
      
      // Find the content container within the modal
      const modalContent = navigateAwayModal.querySelector('[aria-describedby="nav-confirmation-message"]') || navigateAwayModal;

      if (!chrome?.runtime?.getURL) {
        throw new Error('Chrome runtime not available');
      }

      const url = chrome.runtime.getURL(`${type}.html`);
      console.log('Loading HTML from:', url);
      
      fetch(url)
        .then(response => {
          console.log(`${type} fetch response:`, response.status, response.statusText);
          if (!response.ok) {
            throw new Error(`Failed to load ${type}.html: ${response.status} ${response.statusText}`);
          }
          console.log(`${type} response is OK, getting text...`);
          return response.text();
        })
        .catch(error => {
          console.error(`${type} fetch failed:`, error);
          throw error;
        })
        .then(html => {
          console.log(`${type} HTML loaded, length:`, html ? html.length : 'undefined');
          if (!html || !html.trim()) {
            throw new Error(`Empty content in ${type}.html`);
          }
          console.log(`${type} HTML content preview:`, html.substring(0, 100));

          let popup = document.createElement('div');
          popup.id = `${type}-popup`;
          popup.innerHTML = html;
          
          // First remove any existing popup of the same type
          let existingPopup = navigateAwayModal.querySelector(`#${type}-popup`);
          if (existingPopup) {
            existingPopup.remove();
          }

          // Insert popups within the modal content in a container
          let popupContainer = modalContent.querySelector('.session-popups-container');
          if (!popupContainer) {
            popupContainer = document.createElement('div');
            popupContainer.className = 'session-popups-container';
            popupContainer.style.display = 'flex';
            popupContainer.style.flexDirection = 'column';
            popupContainer.style.gap = '20px';
            modalContent.appendChild(popupContainer);
          }

          // Add popup to the container
          if (type === 'NPS') {
            // NPS goes after sessionSuccess
            popupContainer.appendChild(popup);
          } else {
            // sessionSuccess goes first
            popupContainer.insertBefore(popup, popupContainer.firstChild);
          }

          // Add the popup to the page
          navigateAwayModal.children[0].children[0].children[0].appendChild(popup);

          let resolved = false;

          // Set up button listeners
          popup.querySelectorAll(`button[class$="-btn"]`).forEach(btn => {
            btn.addEventListener('click', function(e) {
              e.preventDefault();
              if (resolved) return;
              
              const allButtons = popup.querySelectorAll('button[class$="-btn"]');
              allButtons.forEach(b => b.classList.remove('selected'));
              btn.classList.add('selected');
              
              let feedback = btn.getAttribute('data-score');
              if (!isNaN(feedback)) {
                feedback = parseInt(feedback, 10);
              }
              
              updateResultUserTestingFields(type, feedback);
              popup.remove();
              resolved = true;
              resolve(feedback);
            });
          });

          // Set up close button listener
          const closeBtn = popup.querySelector('.popup-close');
          if (closeBtn) {
            closeBtn.addEventListener('click', function() {
              popup.remove();
              resolved = true;
              resolve('__CANCEL__');
            });
          }
        })
        .catch(err => {
          console.error('Failed to inject popup:', err);
          resolve('__CANCEL__');
        });

    } catch (err) {
      console.error('Failed to inject popup:', err);
      resolve('__CANCEL__');
    }
  });
}

const flagTypes = [
  { type: "incorrect_label", label: "Incorrect Label", emoji: "🏷️" },
  { type: "wrong_biolink_category", label: "Wrong Biolink Category", emoji: "📕" },
  { type: "wrong_link", label: "Wrong Link", emoji: "🔗" }
];

const observedPanels = new Set();

function setupMutationObserver() {
  console.log('setupMutationObserver called');
  // Log all elements with class containing "accordion"
  const allAccordionElements = document.querySelectorAll('[class*="accordion"]');
  console.log('All accordion-related elements:', allAccordionElements);
  
  // Observe accordion panels for open/close
  const panels = document.querySelectorAll('[class*="accordionPanel"]');
  console.log('Found panels:', panels ? panels.length : 0, 'panels');
  
  // If no panels found, let's log the entire body HTML for debugging
  if (!panels || panels.length === 0) {
    console.log('No panels found. Current body HTML:', document.body.innerHTML);
  }
  panels.forEach(panel => {
    if (observedPanels.has(panel)) return;
    observedPanels.add(panel);

    const observer = new MutationObserver(async mutations => {
      for (const mutation of mutations) {
        if (mutation.attributeName === 'aria-hidden') {
          const isNowVisible = panel.getAttribute('aria-hidden') === 'false';
          const wasHidden = mutation.oldValue === 'true';
          console.log('Mutation observed on panel:', panel, { isNowVisible, wasHidden });

          if (isNowVisible && wasHidden) {
            console.log('Panel opened:', panel);
            console.log('Current state:', { 
              currentOpenPanel: currentOpenPanel ? 'exists' : 'null',
              isPanelDifferent: currentOpenPanel !== panel,
              workflowPromise: currentWorkflowPromise ? 'exists' : 'null'
            });
            console.log('current workflow panel: ', currentOpenPanel);
            console.log('newly opened panel: ', panel);
            if (currentOpenPanel && currentOpenPanel !== panel) {
              console.log('Previous panel exists, cleaning up');
              
              // Force cancel any existing workflow
              if (currentWorkflowPromise) {
                console.log('Cancelling existing workflow');
                workflowCancelled = true;
                printAndClearTestingObject(); // Send data for the cancelled workflow
                closeAllPopups(); // Force close any open popups immediately
                console.log('Previous workflow data sent and cleared');
                currentWorkflowPromise = null; // Clear the promise immediately
              }
              try {
                console.log('Attempting to close previous panel in mutation observer');
                closePanel(currentOpenPanel);
                // Wait a moment to ensure the panel starts closing
                await new Promise(resolve => setTimeout(resolve, 100));
                // if (currentOpenPanel.getAttribute('aria-hidden') !== 'true') {
                //   console.warn('Panel did not close properly in mutation observer, forcing close');
                //   currentOpenPanel.setAttribute('aria-hidden', 'true');
                // }
              } catch (e) {
                console.error('Error closing panel in mutation observer:', e);
              }
              currentOpenPanel = null;
            }

            // Reset state for new workflow
            workflowCancelled = false;
            console.log('Starting new workflow');

            // Start new workflow
            currentOpenPanel = panel;
            currentWorkflowPromise = collectFeedbackPanel(panel)
              .catch(e => console.error('Workflow error:', e))
              .finally(() => {
                currentOpenPanel = null;
                currentWorkflowPromise = null;
              });
          }
        }
      }
    });

    observer.observe(panel, {
      attributes: true,
      attributeOldValue: true,
      attributeFilter: ['aria-hidden']
    });
  });

}



// Initialize observers when the DOM is ready or if it's already loaded
function initializeObservers() {
  console.log('Initializing observers, document.readyState:', document.readyState);
  setupMutationObserver();
  navigateAwayModalObserver();
}

// Check if the DOM is already loaded
if (document.readyState === 'loading') {
  console.log('Document still loading, adding DOMContentLoaded listener');
  document.addEventListener('DOMContentLoaded', initializeObservers);
} else {
  console.log('Document already loaded, initializing immediately');
  initializeObservers();
}

// Set up periodic check for panels
function checkForPanels() {
  const panels = document.querySelectorAll('[class*="accordionPanel"]');
  if (panels && panels.length > 0) {
    console.log('Panels found in periodic check:', panels.length);
    setupMutationObserver();
  }
}

// Check every second for 10 seconds
let checkCount = 0;
const panelCheckInterval = setInterval(() => {
  console.log('Periodic panel check:', checkCount + 1);
  checkForPanels();
  checkCount++;
  if (checkCount >= 10) {
    clearInterval(panelCheckInterval);
    console.log('Stopped periodic panel checks');
  }
}, 1000);

// Also set up dynamic observation for new content
const dynamicObserver = new MutationObserver(function(mutations) {
  console.log('Dynamic observer mutation detected');
  mutations.forEach(mutation => {
    if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
      // Only run if we find new panels or modals
      const hasNewPanels = Array.from(mutation.addedNodes).some(node => {
        const isPanel = node.nodeType === 1 && node.matches?.('[class*="accordionPanel"]');
        if (isPanel) console.log('Found new panel:', node);
        return isPanel;
      });
      const hasNewModal = Array.from(mutation.addedNodes).some(node => 
        node.nodeType === 1 && node.matches?.('[data-testid="navconf-modal"]')
      );
      
      if (hasNewPanels) {
        setupMutationObserver();
      }
      if (hasNewModal) {
        navigateAwayModalObserver();
      }
    }
  });
});

dynamicObserver.observe(document.body, {
  childList: true,
  subtree: true
});

// Functions for extracting IDs from table items

function extractNodeIdFromTableItem(tableItem) {
  if (!tableItem) return null;
  const container = tableItem.querySelector('[class*="nameContainer"]');
  if (!container) return null;
  return container.getAttribute('data-node-id');
}


function extractPredicateIdFromTableItem(tableItem) {
  if (!tableItem) return null;
  const container = tableItem.querySelector('[class*="predicateContainer"]');
  if (!container) return null;
  let rawId = container.getAttribute('data-tooltip-id');
  if (!rawId) return null;
  return rawId.replace(/:r[\w\d]+:?$/, '');
}

function extractARAFromTableItem(panel) {
  if (!panel) return null;
  const container = panel.querySelector('.data-aras');
  if (!container) return null;
  return container.classList.contains('data-aras') ? 'data-aras' : null;
}


const tooltipObserver = new MutationObserver(mutations => {
  mutations.forEach(mutation => {
    mutation.addedNodes.forEach(node => {
      if (
        node.nodeType === 1 &&
        node.getAttribute('role') === 'tooltip' &&
        !node.querySelector('.wrong-flag-btn')
      ) {
        // Find the related container using data-tooltip-id
        const tooltipId = node.id;
        const container = document.querySelector(`[data-tooltip-id="${CSS.escape(tooltipId)}"]`);
        if (!container) return;

        // Determine flag type: node or predicate
        let flagField, entityId, label, category;

        if (container.className.includes("nameContainer")) {
          flagField = "nodeFlag";
          entityId = container.getAttribute('data-node-id');
          // Try to get the label text
          const labelSpan = container.querySelector('._text_1o93p_198');
          label = labelSpan ? labelSpan.innerText.trim() : container.innerText.trim();

          // ---- Extract category from tooltip ----
          const tooltip = document.querySelector('.react-tooltip[role="tooltip"]');
          if (tooltip) {
            const spanWithCategory = tooltip.querySelector('span');
            if (spanWithCategory) {
              const text = spanWithCategory.textContent;
              const match = text.match(/\(([^)]+)\)/);
              category = match ? match[1] : null;
            }
          }
          // --------------------------------------
        } else if (container.className.includes("predicateContainer")) {
          flagField = "predicateFlag";
          let rawId = container.getAttribute('data-tooltip-id');
          entityId = rawId.replace(/:r[\w\d]+:?$/, '');
          const predLabelSpan = container.querySelector('._predLabel_cegci_68');
          label = predLabelSpan ? predLabelSpan.innerText.trim() : container.innerText.trim();
        } else {
          // Unknown container type; skip
          return;
        }

        // Inject flag buttons
        flagTypes.forEach(flag => {
          const flagBtn = document.createElement('button');
          flagBtn.innerHTML = `${flag.emoji} ${flag.label}`;
          flagBtn.className = "wrong-flag-btn";
          flagBtn.style.cssText = `
            background: #fff;
            border: 1px solid #e74c3c;
            color: #e74c3c;
            border-radius: 4px;
            margin: 4px 4px 0 0;
            cursor: pointer;
            font-size: 13px;
            padding: 2px 6px;
            display: inline-block;
          `;
          flagBtn.addEventListener('mousedown', e => {
            e.stopPropagation();
            e.preventDefault();
            // Compose summary
            const summary = `
              You are about to flag:
              - ${flagField === "nodeFlag" ? "Node ID" : "Predicate ID"}: ${entityId}
              - Label: ${label}
              - Issue type: ${flag.label}

              Do you want to submit this report?
            `.trim();
            if (confirm(summary)) {
              // Update feedback object
              updateResultUserTestingFields("flags", {
                flagField: flagField,
                entityId: entityId,
                label: label
              });

              flagBtn.style.background = "#e74c3c";
              flagBtn.style.color = "#fff";
              flagBtn.innerHTML = "✔️ Reported";
              flagBtn.disabled = true;
            }
          });
          node.appendChild(flagBtn);
        });
      }
    });
  });
});
tooltipObserver.observe(document.body, { childList: true, subtree: true });


/////////////////////////////////////////////////////// session feedback:
// Set up observer for the navigate away modal
function navigateAwayModalObserver() {
  if (isObservingNavigateModal) {
    return; // Prevent multiple observers
  }

  function handleModalVisibility(modal) {
    if (modal && 
        modal.className.includes('_true_1kx79_25') && 
        !isHandlingNavigateWorkflow) {
      isHandlingNavigateWorkflow = true;
      currentWorkflowPromise = collectNavigateAwayPanel(modal)
        .finally(() => {
          isHandlingNavigateWorkflow = false;
        });
    }
  }

  const observer = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      if (mutation.type === 'attributes' && 
          mutation.attributeName === 'class' &&
          mutation.target.matches('[data-testid="navconf-modal"]')) {
        handleModalVisibility(mutation.target);
      }
    });
  });

  // Start observing the document for the modal
  function startObserving() {
    const modal = document.querySelector('[data-testid="navconf-modal"]');
    if (modal) {
      isObservingNavigateModal = true;
      observer.observe(modal, {
        attributes: true,
        attributeFilter: ['class']
      });
      // Check initial state
      handleModalVisibility(modal);
    } else {
      // If modal is not found, retry after a short delay
      setTimeout(startObserving, 500);
    }
  }

  startObserving();
}
