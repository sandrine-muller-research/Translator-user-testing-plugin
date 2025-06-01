const nameContainers = document.querySelectorAll('span[class*="_nameContainer_"]');

const userTestingObj = {
      result:{
        QAscore:"",
        novelty:"",
        success:"",
        nodeFlag:""
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
      userTestingObj.result[field] = value;
     }
  }
}
// function updateResultUserTestingFields(field, value) {
//   if ('result' in userTestingObj) {
//     userTestingObj.result[field] = value;
//   }
// }

// To retrieve it later
// const stored = localStorage.getItem("userFeedback");
// const parsed = JSON.parse(stored);
// console.log(parsed);



function showQAPopup() {
  // Remove any existing popup
  let oldPopup = document.getElementById('QA-popup');
  if (oldPopup) oldPopup.remove();

  // Return a Promise!
  return fetch(chrome.runtime.getURL('QAscore.html'))
    .then(response => response.text())
    .then(html => {
      return new Promise((resolve) => {
        let popup = document.createElement('div');
        popup.id = 'QA-popup';
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

        // Add click event listeners to all .nps-btn buttons
        popup.querySelectorAll('.nps-btn').forEach(btn => {
          btn.addEventListener('click', function(e) {
            e.preventDefault();
            let qa_feedback = parseInt(btn.getAttribute('data-score'), 10);
            updateResultUserTestingFields("QAscore", qa_feedback);
            popup.remove();
            resolve(qa_feedback);
          });
        });

        setTimeout(() => {
          if (popup.parentNode) {
            popup.remove();
            resolve(null); // resolve with null if timeout
          }
        }, 15000);
      });
    });
}
function showNoveltyPopup() {
  // Remove any existing popup
  let oldPopup = document.getElementById('novelty-popup');
  if (oldPopup) oldPopup.remove();

  return fetch(chrome.runtime.getURL('novelty.html'))
    .then(response => response.text())
    .then(html => {
      return new Promise((resolve) => {
        let popup = document.createElement('div');
        popup.id = 'novelty-popup';
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

        // Add click event listeners to all .novelty-btn buttons
        popup.querySelectorAll('.novelty-btn').forEach(btn => {
          btn.addEventListener('click', function(e) {
            e.preventDefault();
            document.querySelectorAll('.novelty-btn').forEach(b => b.classList.remove('selected'));
            btn.classList.add('selected');
            let noveltyFeedback = parseInt(btn.getAttribute('data-score'),10);
            updateResultUserTestingFields("novelty", noveltyFeedback);
            popup.remove();
            resolve(noveltyFeedback);
          });
          setTimeout(() => {
            if (popup.parentNode) {
              popup.remove();
              resolve(null); // resolve with null if timeout
            }
          }, 15000);
        });

      });
    });
  }
function showSuccessPopup() {
  // Remove any existing popup
  let oldPopup = document.getElementById('success-popup');
  if (oldPopup) oldPopup.remove();

  return fetch(chrome.runtime.getURL('success.html'))
    .then(response => response.text())
    .then(html => {
      return new Promise((resolve) => {
        let popup = document.createElement('div');
        popup.id = 'success-popup';
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

        // Add click event listeners to all .success-btn buttons
        popup.querySelectorAll('.success-btn').forEach(btn => {
          btn.addEventListener('click', function(e) {
            e.preventDefault();
            if (resolved) return; // Prevent double execution
            document.querySelectorAll('.success-btn').forEach(b => b.classList.remove('selected'));
            btn.classList.add('selected');
            let successFeedback = parseInt(btn.getAttribute('data-score'),10);
            updateResultUserTestingFields("success", successFeedback);
            popup.remove();
            resolved = true;
            resolve(successFeedback);
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
            showQAPopup('QA').then(feedback => {
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

const observer = new MutationObserver(mutations => {
  mutations.forEach(mutation => {
    mutation.addedNodes.forEach(node => {
      if (
        node.nodeType === 1 &&
        node.getAttribute('role') === 'tooltip' &&
        !node.querySelector('.wrong-flag-btn')
      ) {
        // Find the related name container using data-tooltip-id
        const tooltipId = node.id;
        const nameContainer = document.querySelector(`[data-tooltip-id="${tooltipId}"]`);
        if (!nameContainer) return;

        const nodeId = nameContainer.getAttribute('data-node-id');
        // Try to get the label text (adjust selector as needed)
        let label = "";
        const labelSpan = nameContainer.querySelector('._text_1o93p_198');
        if (labelSpan) {
          label = labelSpan.innerText.trim();
        } else {
          // fallback: get all text
          label = nameContainer.innerText.trim();
        }

        // 3. Inject flag buttons
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
          // Use mousedown to catch before tooltip disappears
          flagBtn.addEventListener('mousedown', e => {
            e.stopPropagation();
            e.preventDefault();
            // Compose summary
            const summary = `
              You are about to flag:
              - Node ID: ${nodeId}
              - Label: ${label}
              - Issue type: ${flag.label}

              Do you want to submit this report?
            `.trim();
            if (confirm(summary)) {
              // Update feedback object
              updateResultUserTestingFields("nodeFlag", {
                node_ID: nodeId,
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
          // Add to tooltip
          node.appendChild(flagBtn);
        });
      }
    });
  });
});
observer.observe(document.body, { childList: true, subtree: true });
