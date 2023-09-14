import {CSS} from './utils/css_const';
import * as $ from './utils/dom'

export default class RowControls {

    constructor(options = {}) {
        this.table       = undefined;
        this.rowControls = undefined;

        this.isInitialized = false;

        this.options = {
            onItemHovered : options.onItemHovered,
            onItemHoverOut: options.onItemHoverOut,
        }
    }

    get isInit() {
        return this.isInitialized;
    }

    initRowControls(tableElement) {
        if (this.isInitialized === true) {
            throw new Error('RowControls already initiated')
        }

        this.table       = tableElement;
        this.rowControls = $.make('table', CSS.row_controls);
        this.table.parentNode.appendChild(this.rowControls);

        if (this.table.classList.contains(CSS.withHeadings) === true) {
            this.rowControls.classList.add(CSS.row_controls_with_heading);
        }

        const numberOfRows = this.table.querySelectorAll(`.${CSS.row}`).length;
        for (let rowNumber = 1; rowNumber <= numberOfRows; rowNumber++) {
            console.log(rowNumber);
            this.addControlItemForRowNumber(rowNumber);
        }

        this.isInitialized = true;
    }

    addControlItemForRowNumber(rowNumber) {
        let maxHeight = null;

        const rows = this.table.querySelectorAll(`.${CSS.row}`);
        const row  = rows[rowNumber - 1];

        if (row === undefined) {
            throw new Error(`Row [number: '${rowNumber}'] not found in table`)
        }

        row.querySelectorAll(`.${CSS.cell}:not(.d-none):not([rowspan])`).forEach((cell) => {
            const {height} = cell.getBoundingClientRect();
            if (maxHeight === null || height > maxHeight) {
                maxHeight = height;
            }
        });

        if (maxHeight === null) {
            const heightPerRow = [];

            row.querySelectorAll(`.${CSS.cell}`).forEach((cell) => {
                if (cell.classList.contains('d-none') === true) {
                    const masterCellInfos = cell.getAttribute('data-master-cell').split('_', 2);
                    const masterCell      = {row: parseInt(masterCellInfos[0]), column: parseInt(masterCellInfos[1])}
                    const masterCellElem  = rows[masterCell.row - 1].querySelector(`.${CSS.cell}:nth-child(${masterCell.column})`);

                    console.log('rowspan' + masterCellElem.getAttribute('rowspan'))
                    console.log(masterCellElem);
                    const rowspanValue = parseInt(masterCellElem.getAttribute('rowspan'));
                    const {height}     = masterCellElem.getBoundingClientRect();
                    const finalHeight  = height / rowspanValue;
                    console.log('la ' + finalHeight);
                    if (heightPerRow[masterCell.row] !== undefined) {
                        if (heightPerRow[masterCell.row] < finalHeight) {
                            heightPerRow[masterCell.row] = finalHeight;
                        }
                    } else {
                        heightPerRow[masterCell.row] = finalHeight;
                    }
                } else if (cell.hasAttribute('rowspan')) {
                    const {height}     = cell.getBoundingClientRect();
                    const rowSpanValue = parseInt(cell.getAttribute('rowspan'));
                    console.log('ici' + (height / rowSpanValue));

                    heightPerRow[rowNumber] = height / rowSpanValue;
                }
            });

            const closestRowNHeight = heightPerRow.slice(-1)[0];
            console.log(heightPerRow);
            console.log(closestRowNHeight);

            maxHeight = heightPerRow.slice(-1)[0];
        }

        const rowControl = $.make('tr', CSS.row_control_item);
        rowControl.appendChild($.make('td', ''));
        rowControl.style.height = `${maxHeight}px`;
        this.rowControls.appendChild(rowControl);

        rowControl.addEventListener('mouseover', (event) => this.onRowControlItemHovered(event));
        rowControl.addEventListener('mouseout', (event) => this.onRowControlItemHoverOut(event));
    }

    updateRowControlsTable() {
        if (this.isInit === false) {
            return;
        }

        this.rowControls.innerHTML = "";

        const numberOfRows = this.table.querySelectorAll(`.${CSS.row}`).length;
        for (let rowNumber = 1; rowNumber <= numberOfRows; rowNumber++) {
            this.addControlItemForRowNumber(rowNumber);
        }
    }

    show() {
        this.rowControls.classList.remove('d-none');
    }

    hide() {
        if (this.isInit === false) {
            return;
        }

        this.rowControls.classList.add('d-none');
    }

    onRowControlItemHovered(event) {
        const hoveredRowControlItem = event.target.parentNode;
        hoveredRowControlItem.classList.add('selected');

        if (typeof this.options.onItemHovered === "function") {
            return this.options.onItemHovered(event);
        }

        return true;
    }

    onRowControlItemHoverOut(event) {
        const hoveredRowControlItem = event.target.parentNode;
        hoveredRowControlItem.classList.remove('selected');

        if (typeof this.options.onItemHoverOut === "function") {
            return this.options.onItemHoverOut(event);
        }

        return true;
    }

    destroy() {
        this.rowControls.remove();

        this.table       = undefined;
        this.rowControls = undefined;

        this.isInitialized = false;
    }
}

