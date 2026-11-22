/**
 * Custom modern enhancements for 3DVista Gallery Popups.
 * Non-destructive, handles DOM mutations dynamically.
 */
(function () {
  function applyPopupStyles() {
    // 1. Target all text containers
    var textDivs = document.querySelectorAll('div[style*="text-align:left; color:#000"]');
    textDivs.forEach(function (textDiv) {
      // Find the component container (HTMLText)
      var contentLayer = textDiv.closest('div[tdvlayer="content"]');
      if (contentLayer) {
        var comp = contentLayer.parentElement;
        if (comp && !comp.classList.contains('tdv-clean-box')) {
          comp.classList.add('tdv-clean-box');

          // Hilangkan shadow hitam kasar bawaan 3DVista
          var shadowLayer = comp.querySelector(':scope > div[tdvlayer="shadow"]');
          if (shadowLayer) {
            shadowLayer.style.setProperty('display', 'none', 'important');
            shadowLayer.style.setProperty('box-shadow', 'none', 'important');
          }

          // Ganti gradient abu-abu muram dengan background card bersih & elegan
          var bgLayer = comp.querySelector(':scope > div[tdvlayer="background"]');
          if (bgLayer) {
            bgLayer.style.setProperty('background', '#f8fafc', 'important');
            bgLayer.style.setProperty('border', '1px solid #e2e8f0', 'important');
            bgLayer.style.setProperty('border-radius', '14px', 'important');
            bgLayer.style.setProperty('box-shadow', '0 1px 3px rgba(15, 23, 42, 0.05)', 'important');
          }

          // Padding & radius untuk layer content
          contentLayer.style.setProperty('border-radius', '14px', 'important');
          contentLayer.style.setProperty('padding', '20px 24px', 'important');
          contentLayer.style.setProperty('box-sizing', 'border-box', 'important');

          // Rapikan title jika ada di card yang sama
          var cardContainer = comp.parentElement;
          if (cardContainer) {
            var allLabels = cardContainer.querySelectorAll('div[style*="font-size:"][style*="bold"], div[style*="font-weight:bold"], div[style*="font-weight: bold"]');
            allLabels.forEach(function (lbl) {
              if (!lbl.classList.contains('tdv-popup-title')) {
                lbl.classList.add('tdv-popup-title');
              }
            });
          }
        }
      }

      // 2. Hilangkan tag <p><br></p> kosong bawaan export 3DVista
      var pTags = textDiv.querySelectorAll('p');
      pTags.forEach(function (p) {
        if (!p.textContent.trim()) {
          p.style.setProperty('display', 'none', 'important');
        }
      });

      // 3. Rapikan kelas paragraf dan judul bagian
      var pDivs = textDiv.querySelectorAll(':scope > div');
      pDivs.forEach(function (d) {
        var t = d.textContent.trim();
        if (t.length > 0 && t.length < 50 && !/[.,;:]$/.test(t)) {
          if (!d.classList.contains('tdv-h')) d.classList.add('tdv-h');
          d.classList.remove('tdv-p');
        } else {
          if (!d.classList.contains('tdv-p')) d.classList.add('tdv-p');
          d.classList.remove('tdv-h');
        }
      });
    });

    // 4. Perhalus tombol Close [X]
    var closeIcons = document.querySelectorAll('img[src*="IconButton_43CEF193"]');
    closeIcons.forEach(function (img) {
      img.style.setProperty('border-radius', '8px', 'important');
      if (img.parentElement) {
        img.parentElement.style.setProperty('border-radius', '8px', 'important');
        img.parentElement.style.setProperty('overflow', 'hidden', 'important');
        img.parentElement.style.setProperty('box-shadow', '0 1px 3px rgba(0,0,0,0.12)', 'important');
      }
    });
  }

  // Throttled frame scheduler untuk menghindari main-thread thrashing
  var isScheduled = false;
  function scheduleApply() {
    if (isScheduled) return;
    isScheduled = true;
    requestAnimationFrame(function () {
      isScheduled = false;
      applyPopupStyles();
    });
  }

  // Monitor penambahan DOM node baru (popup dibuka) tanpa trigger loop atribut
  var observer = new MutationObserver(function (mutations) {
    for (var i = 0; i < mutations.length; i++) {
      if (mutations[i].addedNodes.length > 0) {
        scheduleApply();
        break;
      }
    }
  });

  observer.observe(document.documentElement, {
    childList: true,
    subtree: true
  });

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', scheduleApply);
  } else {
    scheduleApply();
  }
})();
