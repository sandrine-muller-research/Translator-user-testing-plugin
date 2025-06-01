const nameContainers = document.querySelectorAll('span[class*="_nameContainer_"]');

const userTestingObj = {
      result:{
        QAscore:"",
        novelty:"",
        success:"",
        flags:[]
      },
      session:{
        timestamp: Date.now(),
        query:{
          pk: "" ////////// TO IMPLEMENT
        }
      }
};

function updateResultUserTestingFields(field, value) {
  if ('result' in userTestingObj) { // Use quotes around 'result'
     if (field in userTestingObj.result) { // Use .result, not [result]
      if (field === "flags"){
        userTestingObj.result[field].append(value);
      }else{
      userTestingObj.result[field] = value;
      }
     }
  }
}


function showPopup(type) {
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

        // Timeout to auto-close the popup if no answer
        setTimeout(() => {
          if (popup.parentNode && !resolved) {
            popup.remove();
            resolved = true;
            resolve(null); // resolve with null if timeout
          }
        }, 15000);

      });
    });
}


function setupMutationObserver() {
  // find all elements with accordionPanel in their class and observe aria-hidden change of status
  let panels = document.querySelectorAll('[class*="accordionPanel"]');

  panels.forEach(panel => {
    let observer = new MutationObserver(function(mutations) {
      mutations.forEach(mutation => {
        if (mutation.attributeName === 'aria-hidden') {
          let isNowVisible = panel.getAttribute('aria-hidden') === 'false';
          let wasHidden = mutation.oldValue === 'true';
          if (isNowVisible && wasHidden) {
            showPopup('QA').then(feedback => {
              if (feedback === 0) {
                // showPopup1();
              } else if (feedback === 10) {
                showPopup('novelty').then(feedback => {
                        if (feedback === 1) { // result novel
                          showPopup('success');
                        } 
                      })
              } else {
                // showPopup3();
              }
            });
          }
        }
      });
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

///////////////////////////////////////////////////// Nodes labels issues:
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
        let flagField, entityId, label;
        if (container.className.includes("nameContainer")) {
          flagField = "nodeFlag";
          entityId = container.getAttribute('data-node-id');
          // Try to get the label text
          const labelSpan = container.querySelector('._text_1o93p_198');
          label = labelSpan ? labelSpan.innerText.trim() : container.innerText.trim();
        } else if (container.className.includes("predicateContainer")) {
          flagField = "predicateFlag";
          // entityId = container.getAttribute('data-tooltip-id'); 
          
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
              updateResultUserTestingFields(flagField, {
                id: entityId,
                label: label,
                issue_type: flag.type
              });
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

