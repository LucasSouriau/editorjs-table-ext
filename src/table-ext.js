import TableSource from "./table";
import Toolbox from "./toolbox";
import {IconCross, IconDirectionLeftDown} from "@codexteam/icons";
import * as $ from "./utils/dom";
import CellSelector from "./cell-selector";
import ColumnResizer from 'column-resizer';
import RowControls from "./row-controls";

const CSS = {
    wrapper                  : 'tc-wrap',
    table                    : 'tc-table',
    withHeadings             : 'tc-table--heading',
    row                      : 'tc-row',
    cell                     : 'tc-cell',
    row_controls             : 'tc-row-controls',
    row_controls_with_heading: 'tc-row-controls--heading',
    row_control_item         : 'tc-row-control-item',
}

export default class Table extends TableSource {
    constructor(readOnly, api, data, config) {
        super(readOnly, api, data, config);
        const self = this;

        this.resizer      = null;
        this.cellSelector = new CellSelector(this);

        this.rowControls = new RowControls({
            onItemHovered : function (event) {
                const hoveredRowControlItem = event.target.parentNode;
                const rowIndex              = Array.prototype.indexOf.call(
                    hoveredRowControlItem.parentNode.children,
                    hoveredRowControlItem
                );

                self.updateToolboxesPosition(rowIndex + 1, 1)
                self.selectRow(rowIndex + 1);
            },
            onItemHoverOut: function () {
                self.unselectRow();
            }
        });

        document.addEventListener('click', (event) => this.documentClickedExt(event));
    }

    bindEvents() {
        // Disable selection while pressing shift + click
        ["keyup", "keydown"].forEach((event) => {
            window.addEventListener(event, (e) => {
                document.onselectstart = function () {
                    return !(e.key === "Shift" && e.shiftKey);
                }
            });
        });

        this.table.addEventListener('mousedown', (event) => this.cellClickedEvent(event));

        document.addEventListener("DOMContentLoaded", () => {
            this.initResizableColumns(this.data.widthColumns);
        });

        super.bindEvents();
    }

    onKeyPressListener(event) {
        const superReturn = super.onKeyPressListener(event);
        if (superReturn === false) {
            return false;
        }

        this.initResizableColumns();
        this.showHoveredCellToolbox(this.focusedCell.row, this.focusedCell.column);

        return true;
    }

    /**
     * @param {number} row
     * @param {number} column
     */
    updateToolboxesPosition(row = this.hoveredRow, column = this.hoveredColumn) {
        if (row > 0 && column > 0) {
            let hoveredCell = {row: row, column: column};
            let hoveredCellElement = this.getCell(row, column);

            if (hoveredCellElement !== undefined) {

                if (hoveredCellElement.classList.contains('d-none') === true) {
                    const masterCellInfos = hoveredCellElement.getAttribute('data-master-cell').split('_', 2);
                    hoveredCell      = {row: parseInt(masterCellInfos[0]), column: parseInt(masterCellInfos[1])};
                    hoveredCellElement    = this.getCell(hoveredCell.row, hoveredCell.column);
                }

                const {fromTopBorder, fromLeftBorder} = $.getRelativeCoordsOfTwoElems(this.table, hoveredCellElement);
                const {width}                 = hoveredCellElement.getBoundingClientRect();

                if (!this.isColumnMenuShowing) {
                    this.toolboxColumn.show(() => {
                        return {
                            left: `${Math.ceil(fromLeftBorder + width / 2)}px`
                        };
                    });
                }

                if (!this.isRowMenuShowing) {
                    this.toolboxRow.show(() => {
                        return {
                            top: `calc(${fromTopBorder}px + 1em)`
                        };
                    });
                }
            }
        }
    }

    onMouseMoveInTable(event) {
        super.onMouseMoveInTable(event);

        if (this.rowControls.isInit === false) {
            this.rowControls.initRowControls(this.table);
        }

        this.rowControls.show();
    }

    createCell() {
        const cell = super.createCell();
        const self = this;
        cell.addEventListener('input', function (event) {
            self.rowControls.updateRowControlsTable();
        });

        return cell;
    }

    createCellToolbox() {
        return new Toolbox({
            api        : this.api,
            cssModifier: 'cell',
            items      : [
                {
                    label  : 'Merge cells',
                    icon   : IconDirectionLeftDown,
                    hideIf : () => {
                        return this.cellSelector.isMergingAvailable === false;
                    },
                    onClick: () => {
                        this.hideRowToolbox();
                        this.hideColumnToolbox();
                        this.toolboxCell.hide();
                        this.cellSelector.mergeCells();
                        this.rowControls.updateRowControlsTable();
                    }
                },
                {
                    label  : 'Split cells',
                    icon   : IconDirectionLeftDown,
                    hideIf : () => {
                        return this.cellSelector.isSplittingAvailable === false;
                    },
                    onClick: () => {
                        this.hideRowToolbox();
                        this.hideColumnToolbox();
                        this.toolboxCell.hide();

                        if (this.cellSelector.hasAlreadyMultipleSelection === false) {
                            this.cellSelector.splitCell({row: this.focusedCell.row, column: this.focusedCell.column})
                        } else {
                            this.cellSelector.splitCellsInSelection();
                        }

                        this.rowControls.updateRowControlsTable();
                    }
                },
                {
                    label  : 'Clear cell(s)',
                    icon   : IconCross,
                    onClick: () => {
                        const cellElem     = this.getCell(this.focusedCell.row, this.focusedCell.column);
                        cellElem.innerText = "";

                        if (cellElem.hasAttribute('selected') === true) {
                            this.cellSelector.selectCellList.forEach((cell) => {
                                const cellSelected     = this.getCell(cell.row, cell.column);
                                cellSelected.innerText = "";
                            })
                        }

                        this.toolboxCell.hide();
                        this.cellSelector.destroy();
                    }
                },
            ],
            onOpen     : () => {
                this.hideRowToolbox();
                this.hideColumnToolbox();
            },
            onClose    : () => {
            }
        });
    }

    documentClickedExt(event) {
        const clickedInsideTable = event.target.closest(`.${CSS.table}`) !== null;

        const hasClikedCellToolbox = this.checkParent(this.toolboxCell.element, event.target);
        const hasClikedRowControls = event.target.parentNode.classList.contains(CSS.row_control_item);
        const hasClickedCell       = event.target.classList.contains(`${CSS.cell}`);

        if (clickedInsideTable === true) {
            this.toolboxCell.hide();

            if (hasClickedCell === true) {
                this.showHoveredCellToolbox();
            }
        } else {
            if (hasClikedRowControls === true) {
                this.selectRowElemCellsByRowControlItem(event.target.parentNode);
            } else if (hasClikedCellToolbox === false) {
                this.toolboxCell.hide();
                this.cellSelector.destroy();
            }
        }
    }

    cellClickedEvent(event) {
        const clickedCellElem = event.target;

        if (event.shiftKey === true) {
            let clickedCell = undefined;
            this.table.querySelectorAll(`.${CSS.row}`).forEach((row, rowIndex) => {
                row.querySelectorAll(`.${CSS.cell}`).forEach((cell, columnIndex) => {
                    if (cell === clickedCellElem) {
                        clickedCell = {row: rowIndex + 1, column: columnIndex + 1};
                    }
                });
            });

            if (clickedCell !== undefined) {
                if (this.cellSelector.hasAlreadyMultipleSelection === true) {
                    this.cellSelector.selectMultipleRows(this.cellSelector.firstSelectedCell, clickedCell);
                } else {
                    this.cellSelector.selectMultipleRows(this.focusedCell, clickedCell);
                }
                return;
            }
        }

        this.cellSelector.destroy();
    }

    initResizableColumns(forceWidths = []) {
        const self = this;

        const options = {
            liveDrag : true,
            minWidth : 40,
            serialize: false,
            widths: forceWidths,
            onDrag   : function () {
                self.hideColumnToolbox();
                self.toolboxCell.hide();
                self.rowControls.updateRowControlsTable();

                if (self.focusedCell.row !== 0 && self.focusedCell.column !== 0) {
                    const cell = self.getCell(self.focusedCell.row, self.focusedCell.column);
                    cell.blur();
                }
            },
        };

        if (!this.resizer) {
            this.resizer = new ColumnResizer(this.table, options);
        } else {
            this.resizer.destroy();
            this.resizer = new ColumnResizer(this.table, options);
        }
    }

    showHoveredCellToolbox(row = this.focusedCell.row, column = this.focusedCell.column) {
        this.toolboxCell.show(() => {
            const hoveredCellElement              = this.getCell(row, column);
            const {fromTopBorder, fromLeftBorder} = $.getRelativeCoordsOfTwoElems(this.table, hoveredCellElement);
            const {width, height}                 = hoveredCellElement.getBoundingClientRect();

            return {
                left: `calc((${fromLeftBorder}px + ${width}px) - var(--toggler-click-zone-size))`,
                top : `calc(${fromTopBorder}px + 1em)`
            };
        });
    }

    /**
     * @returns {HTMLElement} wrapper - where all buttons for a table and the table itself will be
     *
     * TODO try to delete the override
     */
    createTableWrapper() {
        super.createTableWrapper();
        this.toolboxCell = this.createCellToolbox();
        this.wrapper.insertBefore(this.toolboxCell.element, this.toolboxColumn.element);
    }

    /**
     * @returns {HTMLElement}
     */
    addRow(index = -1, setFocus = false) {
        let newRow = null;

        if (index === -1 || index === 1 || (index > 0 && index > this.numberOfRows)) {
            newRow = super.addRow(index, setFocus);

        } else {
            newRow                     = this.prepareAndAddRow(index)
            const insertedRowFirstCell = this.getRowFirstCell(newRow);

            if (insertedRowFirstCell && setFocus === true) {
                $.focus(insertedRowFirstCell);
            }
        }

        if (index !== -1 || (index === -1 && setFocus === true)) {
            if (this.rowControls.isInit === false) {
                this.rowControls.initRowControls(this.table);
            } else {
                this.rowControls.updateRowControlsTable();
            }
        }

        if (setFocus === true) {
            this.initResizableColumns();
        }

        return newRow;
    }

    /**
     * @param rowNumber
     *
     * @returns {HTMLElement}
     */
    prepareAndAddRow(rowNumber) {
        let newRow       = $.make('tr', CSS.row);
        const currentRow = this.getRow(rowNumber);

        for (let columnNumber = 1; columnNumber <= this.numberOfColumns; columnNumber++) {
            const newCell = this.createCell();

            const previousRowNumber = rowNumber - 1;
            const previousRowCell   = {row: previousRowNumber, column: columnNumber};
            const previousRowCellElem   = this.getCell(previousRowCell.row, previousRowCell.column);

            if (previousRowCellElem.classList.contains('d-none') === true) {
                const masterCellInfos = previousRowCellElem.getAttribute('data-master-cell').split('_', 2);
                const masterCell      = {row: parseInt(masterCellInfos[0]), column: parseInt(masterCellInfos[1])};
                const masterCellElem  = this.getCell(masterCell.row, masterCell.column);

                const rowSpanValue = parseInt(masterCellElem.getAttribute('rowspan'));
                if (rowNumber < (previousRowNumber + rowSpanValue)) {
                    newCell.classList.add('d-none');
                    newCell.setAttribute('data-master-cell', `${masterCell.row}_${masterCell.column}`);

                    if (columnNumber === masterCell.column) {
                        masterCellElem.setAttribute('rowspan', `${rowSpanValue + 1}`);
                    }
                }


            } else if (previousRowCellElem.hasAttribute('rowspan') === true) {
                const rowSpanValue = parseInt(previousRowCellElem.getAttribute('rowspan'));
                if (rowNumber < (previousRowNumber + rowSpanValue)) {
                    previousRowCellElem.setAttribute('rowspan', `${rowSpanValue + 1}`);
                    newCell.classList.add('d-none');
                    newCell.setAttribute('data-master-cell', `${previousRowCell.row}_${previousRowCell.column}`);
                }

            }

            // Loop over all next rows
            for (let nextRowNumber = rowNumber; nextRowNumber <= this.numberOfRows; nextRowNumber++) {
                const nextCell = this.getCell(nextRowNumber, columnNumber);
                // If next row cell is a masterCell
                if (nextCell.hasAttribute('colspan') || nextCell.hasAttribute('rowspan')) {
                    // Update all linkedCells rows reference
                    this.table
                        .querySelectorAll(`.${CSS.cell}[data-master-cell="${nextRowNumber}_${columnNumber}"]`)
                        .forEach((linkedCell) => linkedCell.setAttribute('data-master-cell', `${nextRowNumber + 1}_${columnNumber}`))
                }
            }

            newRow.appendChild(newCell);
        }

        newRow = $.insertBefore(newRow, currentRow);

        return newRow;
    }

    /**
     *
     * @param parent Element
     * @param child Element
     * @return {boolean}
     */
    checkParent(parent, child) {
        let node = child.parentNode;

        // keep iterating unless null
        while (node != null) {
            if (node === parent) {
                return true;
            }
            node = node.parentNode;
        }
        return false;
    }

    selectRowElemCellsByRowControlItem(rowControlItem) {
        this.cellSelector.destroy();

        const rowIndex = Array.prototype.indexOf.call(
            rowControlItem.parentNode.children,
            rowControlItem
        );

        const row       = this.getRow(rowIndex + 1);
        // Get first cell not hidden in row
        const firstCell = row.querySelectorAll(`.${CSS.cell}:not(.d-none)`)[0];

        this.cellSelector.selectAllRow(rowIndex + 1);
        this.toolboxCell.hide();
        this.showHoveredCellToolbox(rowIndex + 1, 1)

        firstCell.focus();
    }

    addColumn(columnIndex = -1, setFocus = false) {
        if (this.numberOfColumns >= 15) {
            return;
        }

        super.addColumn(columnIndex, setFocus);

        if (setFocus === true) {
            this.initResizableColumns();
            this.rowControls.updateRowControlsTable();

            this.resizer.destroy();

            const columnNumber   = columnIndex !== -1 ? columnIndex : (this.numberOfColumns);
            const columnControls = this.table.querySelector(`.tc-column-controls`);
            const controlItem    = $.make('td', 'tc-column-control-item');
            columnControls.insertBefore(controlItem, columnControls.childNodes[columnNumber - 1]);

            this.initResizableColumns();
        }
    }

    deleteColumn(index) {
        const initialNumberOfColumns = this.numberOfColumns;
        for (let i = 1; i <= this.numberOfRows; i++) {
            const cell       = this.getCell(i, index);
            let cellToDelete = cell;


            if (cell.hasAttribute('colspan') === true) {
                const colspanValue = parseInt(cell.getAttribute('colspan'));
                if (colspanValue > 2) {
                    $.decreaseSpanAttribute(cell, 'colspan');
                    cellToDelete = this.getCell(i, index + 1);
                } else if (colspanValue === 2) {
                    cellToDelete = this.getCell(i, index + 1);
                    if (cell.hasAttribute('rowspan') === true) {
                        const rowspanValue = parseInt(cell.getAttribute('rowspan'));
                        if (rowspanValue <= 2) {
                            cell.removeAttribute('rowspan');
                            cell.removeAttribute('colspan');
                        } else {
                            cell.removeAttribute('colspan');
                        }
                    } else {
                        cell.removeAttribute('colspan');
                    }
                }
            } else if (cell.classList.contains('d-none') === true) {
                const masterInfos    = cell.getAttribute('data-master-cell').split('_', 2);
                const masterCell     = {row: parseInt(masterInfos[0]), column: parseInt(masterInfos[1])};
                const masterCellElem = this.getCell(masterCell.row, masterCell.column);

                if (masterCell.column < index) {
                    $.decreaseSpanAttribute(masterCellElem, 'colspan');
                } else if (masterCell.column === index) {
                    const colspanValue = masterCellElem.hasAttribute('colspan') ? parseInt(masterCellElem.getAttribute('colspan')) : 1;
                    if (colspanValue <= 2) {
                        const nextCell = this.getCell(i, index + 1);
                        if (nextCell) {
                            nextCell.removeAttribute('data-master-cell');
                            nextCell.classList.remove('d-none');
                        }
                    }
                }
            }

            if (!cellToDelete) {
                return;
            }

            for (let nextColumnNumber = index + 1; nextColumnNumber <= initialNumberOfColumns; nextColumnNumber++) {
                const nextCell = this.getCell(i, nextColumnNumber);
                // If next row cell is a masterCell
                if (nextCell.hasAttribute('colspan') || nextCell.hasAttribute('rowspan')) {
                    // Update all linkedCells rows reference
                    this.table
                        .querySelectorAll(`.${CSS.cell}[data-master-cell="${i}_${nextColumnNumber}"]`)
                        .forEach((linkedCell) => linkedCell.setAttribute('data-master-cell', `${i}_${nextColumnNumber - 1}`))
                }
            }

            cellToDelete.remove();
        }

        const columnControls = this.table.querySelector(`.tc-column-controls`);
        columnControls.childNodes[index - 1].remove();

        this.rowControls.updateRowControlsTable();
        this.initResizableColumns();
    }

    getRow(row) {
        // Check if resize mode = true
        return this.table.querySelectorAll(`.${CSS.row}`)[row - 1];
    }

    getCell(row, column) {
        const rowElem = this.getRow(row);
        return rowElem.querySelectorAll(`.${CSS.cell}`)[column - 1];
    }

    get numberOfRows() {
        return this.table.querySelectorAll(`.${CSS.row}`).length;
    }

    get numberOfColumns() {
        // Check if resize mode = true

        if (this.numberOfRows) {
            return this.getRow(1).querySelectorAll(`.${CSS.cell}`).length;
        }

        return 0;
    }

    deleteRow(index) {
        const data = this.getData();

        const self = this;
        if (data[index - 1] !== undefined) {
            data[index - 1].forEach(function (cellData, columnIndex) {
                if (typeof cellData === "object") {
                    const cellMergedPositions = cellData.cell_merge.split('_');
                    const rowMerge            = parseInt(cellMergedPositions[0]);
                    const columnMerge         = parseInt(cellMergedPositions[1]);

                    if (rowMerge !== index && columnMerge !== (columnIndex + 1)) {
                        return;
                    }

                    const cellMerged = self.getCell(rowMerge, columnMerge);

                    if (rowMerge !== index) {
                        $.decreaseSpanAttribute(cellMerged, 'rowspan');
                    } else {
                        $.decreaseSpanAttribute(cellMerged, 'colspan');
                    }
                }
            });
        }

        super.deleteRow(index);
        this.rowControls.updateRowControlsTable();
    }

    getData() {
        const data        = [];
        const mergedCells = {};

        for (let rowNumber = 1; rowNumber <= this.numberOfRows; rowNumber++) {
            const row   = this.getRow(rowNumber);
            const cells = Array.from(row.querySelectorAll(`.${CSS.cell}`));

            /* KEEP EMPTY ROWS
            const isEmptyRow = cells.every(cell => !cell.textContent.trim() && !cell.classList.contains('d-none'));

            if (isEmptyRow && (rowNumber === this.numberOfRows)) {
                continue;
            }
            */

            cells.forEach((cell, columnIndex) => {
                const columnNumber = columnIndex + 1;
                let rowspanValue   = undefined;

                if (cell.classList.contains('d-none') === true) {
                    (data[rowNumber - 1] ??= [])[columnIndex] = {cell_merge: mergedCells[`${rowNumber}_${columnNumber}`]};
                    return;
                }

                if (cell.hasAttribute('rowspan') === true) {
                    rowspanValue = parseInt(cell.getAttribute('rowspan'));

                    for (let i = (rowNumber + 1); i < (rowNumber + rowspanValue); i++) {
                        mergedCells[`${i}_${columnNumber}`] = `${rowNumber}_${columnNumber}`;
                    }
                }

                if (cell.hasAttribute('colspan') === true) {
                    const colspanValue = parseInt(cell.getAttribute('colspan'));

                    for (let i = (columnNumber + 1); i < (columnNumber + colspanValue); i++) {
                        mergedCells[`${rowNumber}_${i}`] = `${rowNumber}_${columnNumber}`;

                        if (rowspanValue !== undefined) {
                            for (let x = (rowNumber + 1); x < (rowNumber + rowspanValue); x++) {
                                mergedCells[`${x}_${i}`] = `${rowNumber}_${columnNumber}`;
                            }
                        }
                    }
                }

                (data[rowNumber - 1] ??= [])[columnIndex] = cell.innerHTML;
            });
        }

        return data;
    }

    fill() {
        const data = this.data;

        if (data && data.content) {
            let rowNumber    = 0;
            let columnNumber = 0;

            for (let i = 0; i < data.content.length; i++) {
                for (let j = 0; j < data.content[i].length; j++) {
                    rowNumber    = i + 1;
                    columnNumber = j + 1;

                    if (typeof data.content[i][j] === "object") {
                        const currentCell = this.getCell(rowNumber, columnNumber);

                        currentCell.innerHTML = ""
                        currentCell.classList.add('d-none');

                        const cellMergePositions = data.content[i][j].cell_merge.split('_');
                        const rowMerge           = parseInt(cellMergePositions[0]);
                        const columnMerge        = parseInt(cellMergePositions[1]);

                        currentCell.setAttribute('data-master-cell', `${rowMerge}_${columnMerge}`);

                        const cellToMerge = this.getCell(rowMerge, columnMerge);

                        if (rowNumber !== rowMerge && columnNumber !== columnMerge) {
                            continue;
                        }

                        if (rowNumber !== rowMerge) {
                            $.increaseSpanAttribute(cellToMerge, 'rowspan');
                        } else {
                            $.increaseSpanAttribute(cellToMerge, 'colspan');
                        }
                    } else {
                        this.setCellContent(rowNumber, columnNumber, data.content[i][j]);

                        const table     = this;
                        let skipLooking = false;
                        data.content.forEach(function (row) {
                            if (skipLooking === false) {
                                row.forEach(function (cell) {
                                    if (skipLooking === false && typeof cell === "object" && cell.cell_merge === `${rowNumber}_${columnNumber}`) {
                                        const cellElem = table.getCell(rowNumber, columnNumber);
                                        cellElem.setAttribute('rowspan', '1');
                                        cellElem.setAttribute('colspan', '1');

                                        skipLooking = true;
                                    }
                                })
                            }
                        })
                    }
                }
            }

            if (this.config.columnResize) {
                const widthColumns = this.data.widthColumns ?? [];

                const columnControlsElem = $.make('tr', 'tc-column-controls');
                this.table.prepend(columnControlsElem);
                for (let i = 1; i <= columnNumber; i++) {
                    const columnControlItemElem = $.make('td', 'tc-column-control-item');

                    if (widthColumns[i - 1] !== undefined) {
                        columnControlItemElem.style.width = widthColumns[i-1];
                    }

                    columnControlsElem.appendChild($.make('td', 'tc-column-control-item'));
                }
            }
        }
    }

    getHoveredCell(event) {
        let hoveredRow    = this.hoveredRow;
        let hoveredColumn = this.hoveredColumn;

        const hoveredCell = event.target;

        this.table.querySelectorAll(`.${CSS.row}`).forEach((row, rowIndex) => {
            row.querySelectorAll(`.${CSS.cell}`).forEach((cell, columnIndex) => {
                if (cell === hoveredCell) {
                    hoveredRow    = rowIndex + 1;
                    hoveredColumn = columnIndex + 1;
                }
            });
        });

        return {
            row   : hoveredRow || this.hoveredRow,
            column: hoveredColumn || this.hoveredColumn
        };
    }
}

