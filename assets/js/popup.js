let search
let container
let loading

/**
 * get validIconURL
 * @param {array} icons -- icons array
 * @return {string} valid icon URL
 */
function validIconURL(icons) {
  if (icons && icons[0] && icons[0].url) {
    return icons[0].url
  }
  return '/assets/images/null.jpg'
}

/**
 * get shorted extension name
 * @param {string} shortName -- short extension name
 * @return {string} shortened extension name
 */
function shortExtensionName(shortName) {
  const limit = 18
  if (shortName.length > limit) {
    return shortName.slice(0, limit)
  }
  return  shortName
}

/**
 * generate extension item template
 * @param {object} extension -- extension info object
 * @return {string} extension item template HTML
 */
function extensionItemTemplate(extension) {
  const {
    shortName,   // 扩展名
    id,          // 扩展 id
    enabled,     // 是否启用
    homepageUrl, // 扩展主页地址
    icons,       // 扩展图标
    version,     // 扩展版本号
  } = extension

  return `
    <div
      class="extension"
      extId="${id}"
      extName="${shortName}"
    >
      <input
        type="checkbox"
        class="isEnabled"
        id=${id}
        ${enabled ? "checked" : ""}
        isEnabled="${enabled ? true : false}"
      />
      <img
        class="icons"
        id="${shortName}_icon"
        src=${validIconURL(icons)}
      />
      <a
        class="link"
        href="${homepageUrl}"
        target="_blank"
      >
        <span
          class="shortName${enabled ? "Checked" : ""} extNameSpan"
          title="${shortName}"
          id="shortName${id}"
        >
        ${shortExtensionName(shortName)}@${version}
        </span>
      </a>
      <span
        class="uninstall"
        id="${id}"
        isEnabled="${enabled ? true : false}"
      >
      </span>
    </div>
  `
}

function getAllExtensions() {
  $('#search').val('')
  container.html('<div class="loading">loading...</div>')

  chrome.management.getAll(function (extensions) {
    search
      .attr('placeholder', `Search ${extensions.length} extensions`);

    let extensionsList = ''
    let enabledCount = 0

    extensions
      //.filter(extension => extension.enabled)
      .forEach(extension => {
        if (extension.enabled) {
          enabledCount++
        }
        extensionsList += extensionItemTemplate(extension)
      })

    const summary = `
      <div class="summary">
        <span id="enabled">${enabledCount}</span>/
        <span id="total">
        ${extensions.length}
        </span>
        </h3>
      </div>
    `

    loading = $('.loading')
    loading.hide()
    container.append(summary + extensionsList)
    search.focus()
  });
}

$(function () {
  search = $('#search');
  container = $('.container')
  getAllExtensions()

  container.on('click', '.uninstall', function() {
    const currentTarget = $(this)
    const id = currentTarget.attr('id');

    chrome.management.uninstall(id, {showConfirmDialog: true}, function() {
      getAllExtensions()
    });
  });

  container.on('change', '.isEnabled', function () {
    const currentTarget = $(this)
    const isEnabled = currentTarget.attr('isEnabled')
    const id = currentTarget.attr('id')
    if (isEnabled === 'false') {
      chrome.management.setEnabled(id, true, function() {
        getAllExtensions()
      });
    } else {
      chrome.management.setEnabled(id, false, function() {
        getAllExtensions()
      });
    }
  });

  $('#search').keyup(
    function searchExtensions() {
      const keyword = $(this).val().toUpperCase();
      const extensions = $('div.extension');

      extensions.each(function(_index, element) {
        const currentTarget = $(element)
        const name = currentTarget.attr('extName')

        if (currentTarget.find('.highlight').length !== 0) {
          currentTarget
            .find('.highlight')
            .replaceWith(currentTarget.find('.highlight').html());
        }

        if (name.toUpperCase().indexOf(keyword) > -1) {
          currentTarget.css('display', 'flex');

          const regex = RegExp(`${keyword}`, "i");
          currentTarget
            .find('span.extNameSpan')
            .html(
              currentTarget.find('span.extNameSpan').html()
              .replace(regex, `<span class="highlight">$&</span>`)
            );
        } else {
          currentTarget.css('display', 'none')
        }
      });
    })
});
