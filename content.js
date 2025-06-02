const nameContainers = document.querySelectorAll('span[class*="_nameContainer_"]');
let workflowCancelled = false;

const userTestingObj = {
      result:{
        QA:"",
        novelty:"",
        success:"",
        reasoning:"",
        datasource:"",
        datavalueNeed:"",
        datavalueUniqueness:"",
        flags:[]
      },
      session:{
        timestamp: Date.now(),
        query:{
          pk: "" ////////// TO IMPLEMENT
        }
      }
};

function printAndClearTestingObject() {
  console.log('Testing object:', userTestingObj);
  closeAllPopups()

}

function updateResultUserTestingFields(field, value) {
  if ('result' in userTestingObj) { // Use quotes around 'result'
     if (field in userTestingObj.result) { // Use .result, not [result]
      if (field === "flags"){
        userTestingObj.result[field].push(value);
      }else{
      userTestingObj.result[field] = value;
      }
     }
  }
}

function waitForPanelClose(panel) {
  return new Promise(resolve => {
    // If the panel is already closed, resolve immediately
    if (panel.getAttribute('aria-hidden') === 'true') {
      resolve();
      return;
    }
    // Otherwise, observe for changes
    const observer = new MutationObserver(mutations => {
      mutations.forEach(mutation => {
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

async function collectAllFeedback(panel) {
  // Start both feedback processes
  const workflowPromise = runWorkflow(panel); // Resolves when workflow is done
  const flagPromise = waitForPanelClose(panel); // Resolves when panel is closed

  // Wait for both to finish
  await Promise.all([workflowPromise, flagPromise]);

  // Now print and clear, regardless of whether any flags were recorded
  printAndClearTestingObject();
  closeAllPopups();
  closePanel(panel); // Optionally, if not already closed
}


async function runWorkflow(panel) {
  let workflowCancelled = false;

  // Monitor for panel close
  const panelObserver = new MutationObserver(mutations => {
    mutations.forEach(mutation => {
      if (
        mutation.attributeName === 'aria-hidden' &&
        panel.getAttribute('aria-hidden') === 'true'
      ) {
        workflowCancelled = true;
        closeAllPopups();
        panelObserver.disconnect();
      }
    });
  });
  panelObserver.observe(panel, { attributes: true, attributeFilter: ['aria-hidden'] });

  // --- Workflow steps ---
  let qaFeedback = await showPopup('QA');
  if (workflowCancelled || qaFeedback === '__CANCEL__') return;

  if (qaFeedback === 0) {
    return;
  } else if (qaFeedback === 10) {
    let noveltyFeedback = await showPopup('novelty');
    if (workflowCancelled || noveltyFeedback === '__CANCEL__') return;
    if (noveltyFeedback === 1) {
      await showPopup('success');
      return;
    }
  } else {
    let reasoningFeedback = await showPopup('reasoning');
    if (workflowCancelled || reasoningFeedback === '__CANCEL__') return;
    if (reasoningFeedback === 0) {
      await showPopup('datasource');
      if (workflowCancelled) return;
      await showPopup('datavalueNeed');
      if (workflowCancelled) return;
      await showPopup('datavalueUniqueness');
      if (workflowCancelled) return;
      return;
    } else {
      return;
    }
  }
}



async function showPopup(type) {
  // Remove any existing popup of this type
  let oldPopup = document.getElementById(`${type}-popup`);
  if (oldPopup) oldPopup.remove();

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

        // Timeout removed as requested

      });
    });
}



const observedPanels = new Set();

function setupMutationObserver() {
  // Find all elements with accordionPanel in their class and observe aria-hidden change of status
  let panels = document.querySelectorAll('[class*="accordionPanel"]');

  panels.forEach(panel => {
    if (observedPanels.has(panel)) return; // Prevent double-observing
    observedPanels.add(panel);

    let observer = new MutationObserver(async function(mutations) {
      for (const mutation of mutations) {
        if (mutation.attributeName === 'aria-hidden') {
          let isNowVisible = panel.getAttribute('aria-hidden') === 'false';
          let wasHidden = mutation.oldValue === 'true';
          if (isNowVisible && wasHidden) {
            // Start the feedback workflow when the panel is opened!
            collectAllFeedback(panel);
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


setupMutationObserver();

let dynamicObserver = new MutationObserver(function(mutations) {
  mutations.forEach(mutation => {
    if (mutation.type === 'childList') {
      setupMutationObserver();
    }
  });
});

dynamicObserver.observe(document.body, {
  childList: true,
  subtree: true
});

///////////////////////////////////////////////////// labels issues:
const flagTypes = [
  { type: "incorrect_label", label: "Incorrect Label", emoji: "🏷️" },
  { type: "wrong_biolink_category", label: "Wrong Biolink Category", emoji: "📕" },
  { type: "wrong_link", label: "Wrong Link", emoji: "🔗" }
];

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
              // updateResultUserTestingFields(flagField, {
              //   "id": entityId,
              //   "label": label,
              //   "issue_type": flag.type
              // });
              // Optionally, provide visual feedback
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

