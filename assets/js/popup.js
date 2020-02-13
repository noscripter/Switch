$(function () {
  function focus() {
    $('#myInput').focus();
  }

  /* Chrome Management */
  chrome.management.getAll(function (info) {
    // Set Search Box Placeholder
    $('#myInput').attr('placeholder', `Search ${info.length} extensions`);

    let TOTAL = info.length;
    let containerContent = `<div class="summary">
      <span id="enabled">{{ENALBED}}</span>/
      <span id="total">
      ${TOTAL}
      </span>
      </h3>
    </div>`;

    let count = 0;
    // Operate DOM and Append Elements Dynamically
    info.forEach(element => {
      // Get Each Extension's Info
      let shortName = element.shortName;
      let id = element.id;
      let elementEnabled = element.enabled;
      let enabled = "";
      if (elementEnabled) {
        enabled = "checked";
        count++;
      }
      let description = element.description;
      let homepageUrl = element.homepageUrl;
      let icons = "/assets/images/null.jpg";
      if (typeof (element.icons) !== "undefined") {
        icons = element.icons[0].url;
      }

      containerContent +=
        `<div class="extension">
          <input type="checkbox" class="isEnabled" id="${id}" ${enabled} />
          <img class="icons" id="${shortName}_icon" src=${icons} />
          <a class="link" href="${homepageUrl}" target="_blank" title=${shortName}>
            <span class="shortName_${enabled} mySpan" href="${homepageUrl}">
            ${shortName}
            </span>
          </a>
          <button class="uninstall" id="${id}">REMOVE</button>
        </div>`;
    });

    $('.container').append(containerContent.replace("{{ENALBED}}", count));

    focus();
  });

  function decreaseTotal() {
    $('#total').html(parseInt($('#total').html()) - 1);
  }

  function updateEnabled(target) {
    if ($(target).parent('div').find('input').attr('checked') === 'checked') {
      decreaseEnabled()
    }
  }

  function increaseEnabled() {
    let enabled = parseInt($('#enabled').html()) || 0;
    $('#enabled').html(enabled >= 0 ? enabled + 1 : 0);
  }

  function decreaseEnabled() {
    let enabled = parseInt($('#enabled').html()) || 0;
    $('#enabled').html(enabled > 0 ? enabled - 1 : 0);
  }

  /* Events */

  // Click uninstall btn
  $('.container').on('click', '.uninstall', function () {
    let id = $(this).attr('id');
    chrome.management.uninstall(id, {showConfirmDialog: true});

    decreaseTotal();
    updateEnabled(this);
  });

  // Checkbox Change Event
  $('.container').on('change', '.isEnabled', function () {
    if ($(this).is(':checked')) {
      $(this).next().next().removeClass('shortName_').addClass('shortName_checked');
      chrome.management.setEnabled($(this).attr('id'), true);
      increaseEnabled();
    } else {
      $(this).next().next().removeClass('shortName_checked').addClass('shortName_');
      chrome.management.setEnabled($(this).attr('id'), false);
      decreaseEnabled();
    }
  });

  // Keyup Event
  $('#myInput').keyup(function searchExtensions() {
    let keyword = $(this).val();
    let input = $(this).val().toUpperCase();
    let cnt = $('.container');
    let extensions = $('div.extension');
    let shortName = "";

    extensions.each(function (index, element) {
      shortName = $(element).find('span.mySpan').text();

      // Clear highlight span
      if ($(element).find('.highlight').length !== 0) {
        $(element)
          .find('.highlight')
          .replaceWith($(element).find('.highlight').html());
      }

      // Highlight keyword and Change display
      if (shortName.toUpperCase().indexOf(input) > -1) {
        $(element).css('display', "block");

        // Highlight
        let regex = RegExp(`${keyword}`, "i");
        $(element)
          .find('span.mySpan')
          .html(
            $(element).find('span.mySpan').html()
            .replace(regex, `<span class=\"highlight\">$&</span>`)
          );
      } else {
        $(element).css('display', "none");
      }
    });
  });
});
