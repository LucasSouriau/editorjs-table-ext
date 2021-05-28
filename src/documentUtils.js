/**
 * Checks the item is not missed or messed
 * 
 * @param {object|string[]|Element[]|HTMLElement|string} elem - element
 * @returns {boolean} true if element is correct
 * @private
 */
function _isNotMissed(elem) {
  return (!(elem === undefined || elem === null));
}

/**
 * Create DOM element with set parameters
 * @param {string} tagName - Html tag of the element to be created
 * @param {string[]} cssClasses - Css classes that must be applied to an element
 * @param {object} attrs - Attributes that must be applied to the element
 * @param {Element[]} children - child elements of creating element
 * @returns {HTMLElement} the new element
 */
export function create(tagName, cssClasses = null, attrs = null, children = null) {
  const elem = document.createElement(tagName);

  if (_isNotMissed(cssClasses)) {
    for (let i = 0; i < cssClasses.length; i++) {
      if (_isNotMissed(cssClasses[i])) {
        elem.classList.add(cssClasses[i]);
      }
    }
  }
  if (_isNotMissed(attrs)) {
    for (let key in attrs) {
      elem.setAttribute(key, attrs[key]);
    }
  }
  if (_isNotMissed(children)) {
    for (let i = 0; i < children.length; i++) {
      if (_isNotMissed(children[i])) {
        elem.appendChild(children[i]);
      }
    }
  }
  return elem;
}

/**
 * Get item position relative to document
 * 
 * @param {HTMLElement} elem - item
 * @returns {{x1: number, y1: number, x2: number, y2: number}} coordinates of the upper left (x1,y1) and lower right(x2,y2) corners
 */
export function getCoords(elem) {
  const rect = elem.getBoundingClientRect();

  return {
    y1: Math.floor(rect.top + window.pageYOffset),
    x1: Math.floor(rect.left + window.pageXOffset),
    x2: Math.floor(rect.right + window.pageXOffset),
    y2: Math.floor(rect.bottom + window.pageYOffset)
  };
}

export function getRelativeCoordsOfTwoElems(firstElem, secondElem) {
  const firstCoords = getCoords(firstElem);
  const secondCoords = getCoords(secondElem);

  return {
    y1: secondCoords.y1 - firstCoords.y1,
    x1: secondCoords.x1 - firstCoords.x1,
    x2: secondCoords.x2 - firstCoords.x2,
    y2: secondCoords.y2 - firstCoords.y2
  }
}

/**
 * Get the coordinates relative to the parent element
 * 
 * @param {HTMLElement} elem 
 * @param {Event} event 
 * @returns mouse position relative to the element
 */
export function getRelativeCoords(elem, event) {
  const rect = elem.getBoundingClientRect();
  const { width, height, x, y } = rect;
  const { clientX, clientY } = event;

  return {
    width,
    height,
    x: clientX - x,
    y: clientY - y
  }
}

/**
 * Calculates the row and column that the cursor is currently hovering over
 * 
 * @param {HTMLElement} table - table element
 * @param {Event} event - mousemove event
 * @param {number} numberOfColumns - number of columns in the table
 * @param {number} numberOfRows - number of rows in the table
 * @returns hovered cell coordinates as an integer row and column
 */
export function hoveredCell(table, event, numberOfColumns, numberOfRows) {
  const { width, height, x, y } = getRelativeCoords(table, event);
  const hoveredRow =  Math.floor(y / (height / numberOfRows)) + 1;
  const hoveredColumn = Math.floor(x / (width / numberOfColumns)) + 1;

  return {
    row: hoveredRow,
    column: hoveredColumn
  }
}

/**
 * Insert element after the referenced
 * 
 * @param {HTMLElement} newNode 
 * @param {HTMLElement} referenceNode
 * @returns {HTMLElement}
 */
export function insertAfter(newNode, referenceNode) {
  return referenceNode.parentNode.insertBefore(newNode, referenceNode.nextSibling);
}

/**
 * Insert element after the referenced
 * 
 * @param {HTMLElement} newNode 
 * @param {HTMLElement} referenceNode 
 * @returns {HTMLElement}
 */
 export function insertBefore(newNode, referenceNode) {
  return referenceNode.parentNode.insertBefore(newNode, referenceNode);
}