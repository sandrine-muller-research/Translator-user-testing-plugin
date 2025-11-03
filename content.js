
// Initialize global state
let workflowCancelled = false;
const PK = getPkFromUrl(window.location.href);
let currentOpenPanel = null;
let currentWorkflowPromise = null;
let isObservingNavigateModal = false;
let isHandlingNavigateWorkflow = false;


const userTestingObjTemplate = {
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
  userTestingObj = JSON.parse(JSON.stringify(userTestingObjTemplate));
  userTestingObj.session.timestamp = Date.now();
  userTestingObj.session.pk = PK;
}


function sendToGoogleForm(userTestingObj) {
  console.log('Sending to Google Form:', userTestingObj);
  const formUrl = 'https://docs.google.com/forms/u/0/d/e/1FAIpQLScFrEtToJT97jeUZ-9fUJil9kqwK7EzLGokj7E3nTJCx9WvGQ/formResponse';
  
  // Replace these with your actual entry IDs!
  const formData = new URLSearchParams();
  formData.append('entry.1142791448', userTestingObj.result.object);
  formData.append('entry.455615436', userTestingObj.result.predicate);
  formData.append('entry.1703541576', userTestingObj.result.QA);
  formData.append('entry.652081313', userTestingObj.result.novelty);
  formData.append('entry.1262337293', userTestingObj.result.success);
  formData.append('entry.1304457557', userTestingObj.result.reasoning);
  formData.append('entry.17482856', userTestingObj.result.datasource);
  formData.append('entry.1912985814', userTestingObj.result.datavalueNeed);
  formData.append('entry.1319177885', userTestingObj.result.datavalueUniqueness);
  formData.append('entry.1022165891', userTestingObj.session.timestamp);
  formData.append('entry.1257738886', userTestingObj.session.query.pk);
  formData.append('entry.52800901', JSON.stringify(userTestingObj.result.flags)); // flags as JSON
  formData.append('entry.875801026', userTestingObj.session.sessionSuccess);
  formData.append('entry.764010696', userTestingObj.session.NPS);

  fetch(formUrl, {
    method: 'POST',
    mode: 'no-cors',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body: formData
  });

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

function closePanel(panel) {
  panel.setAttribute('aria-hidden', 'true');
}


function waitForPanelClose(panel) {
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
  // Clean up any existing workflow first
  closeAllPopups();
  printAndClearTestingObject();

  resetUserTestingObj();
  console.log('Collecting feedback for panel:', panel);
  
  // Start feedback processes
  const object = extractNodeIdFromTableItem(panel);
  const predicate = extractPredicateIdFromTableItem(panel);
  updateResultUserTestingFields('object', object);
  updateResultUserTestingFields('predicate', predicate);
  
  try {
    const workflowPromise = runPopupWorkflow(panel); // Resolves when workflow is done
    const flagPromise = waitForPanelClose(panel); // Resolves when panel is closed
    
    // Wait for both to finish
    await Promise.all([workflowPromise, flagPromise]);
  } catch (e) {
    console.error('Error in feedback workflow:', e);
  } finally {
    // Always clean up when done, whether successful or not
    printAndClearTestingObject();
    closeAllPopups();
    closePanel(panel);
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
  workflowCancelled = false;  // Use the global workflowCancelled

  // Promise that resolves when the panel is closed
  const panelClosedPromise = new Promise(resolve => {
    const panelObserver = new MutationObserver(mutations => {
      mutations.forEach(mutation => {
        if (
          mutation.attributeName === 'aria-hidden' &&
          panel.getAttribute('aria-hidden') === 'true'
        ) {
          workflowCancelled = true;
          closeAllPopups();
          panelObserver.disconnect();
          resolve('cancelled'); // <-- Resolves the promise
        }
      });
    });
    panelObserver.observe(panel, { attributes: true, attributeFilter: ['aria-hidden'] });
  });

  // Helper to race workflow steps against panel close
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
    return Promise.race([
      injectPopup(popupName),
      panelClosedPromise
    ]);
  }

  // --- Workflow steps ---
  let qaFeedback = await raceStep('QA');
  if (workflowCancelled || qaFeedback === '__CANCEL__' || qaFeedback === 'cancelled') return 'cancelled';

  if (qaFeedback === 0) {
    return;
  } else if (qaFeedback === 10) {
    let noveltyFeedback = await raceStep('novelty');
    if (workflowCancelled || noveltyFeedback === '__CANCEL__' || noveltyFeedback === 'cancelled') return 'cancelled';
    if (noveltyFeedback === 1) {
      await raceStep('success');
      return;
    }
  } else {
    let reasoningFeedback = await raceStep('reasoning');
    if (workflowCancelled || reasoningFeedback === '__CANCEL__' || reasoningFeedback === 'cancelled') return 'cancelled';
    if (reasoningFeedback === 0) {
      await raceStep('datasource');
      if (workflowCancelled) return 'cancelled';
      await raceStep('datavalueNeed');
      if (workflowCancelled) return 'cancelled';
      await raceStep('datavalueUniqueness');
      if (workflowCancelled) return 'cancelled';
      return;
    } else {
      return;
    }
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
  // Observe accordion panels for open/close
  const panels = document.querySelectorAll('[class*="accordionPanel"]');

  panels.forEach(panel => {
    if (observedPanels.has(panel)) return;
    observedPanels.add(panel);

    const observer = new MutationObserver(async mutations => {
      for (const mutation of mutations) {
        if (mutation.attributeName === 'aria-hidden') {
          const isNowVisible = panel.getAttribute('aria-hidden') === 'false';
          const wasHidden = mutation.oldValue === 'true';

          if (isNowVisible && wasHidden) {
            // Handle previous panel if different from new one
            if (currentOpenPanel && currentOpenPanel !== panel) {
              // Visual close
              currentOpenPanel.setAttribute('aria-hidden', 'true');
              
              // Force cleanup of previous workflow
              if (currentWorkflowPromise) {
                workflowCancelled = true;  // Signal cancellation to any running workflow
                closeAllPopups();
                printAndClearTestingObject();
                closePanel(currentOpenPanel);
                currentWorkflowPromise = null;
              }
            }

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



// setupMutationObserver();
navigateAwayModalObserver();

let dynamicObserver = new MutationObserver(function(mutations) {
  mutations.forEach(mutation => {
    if (mutation.type === 'childList') {
      setupMutationObserver();
      navigateAwayModalObserver();
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
// function navigateAwayModalObserver() {
//   // Select the modal element by its data-testid
//   const navigateAwayModal = document.querySelector('[data-testid="navconf-modal"]');
//   if (!navigateAwayModal) return;

//   // Callback for MutationObserver
//   const observerCallback = (mutationsList) => {
//     for (const mutation of mutationsList) {
//       if (
//         mutation.type === 'attributes' &&
//         mutation.attributeName === 'class'
//       ) {
//         const classList = navigateAwayModal.className;
//         // Check if the class includes '_true_1kx79_25'
//         if (classList.includes('_true_1kx79_25')) {
//           // Run your workflow
//           window.currentWorkflowPromise = collectNavigateAwayPanel(navigateAwayModal);
//         }
//       }
//     }
//   };

//   // Create observer
//   const observer = new MutationObserver(observerCallback);

//   // Start observing class attribute changes
//   observer.observe(navigateAwayModal, { attributes: true, attributeFilter: ['class'] });

//   // Optionally, return the observer for later disconnecting/removal
//   return observer;
// }


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
