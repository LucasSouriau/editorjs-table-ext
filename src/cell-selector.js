import {CSS} from './utils/css_const';
import * as $ from './utils/dom'

export default class CellSelector {

    constructor(tableExt) {
        this.tableExt = tableExt;

        this.selectCellList = [];


        this.minSelectedRow
            = this.maxSelectedRow
            = this.minSelectedColumn
            = this.maxSelectedColumn
            = null;
    }

    get hasAlreadyMultipleSelection() {
        return this.selectCellList.length > 0;
    }

    get firstSelectedCell() {
        if (this.hasAlreadyMultipleSelection === false) {
            throw new Error("No selection initiated - unable to find firstSelectedCell");
        }

        return this.selectCellList[0];
    }

    get currentMinAndMaxPositions() {
        return {
            minRow   : this.minSelectedRow,
            maxRow   : this.maxSelectedRow,
            minColumn: this.minSelectedColumn,
            maxColumn: this.maxSelectedColumn,
        };
    }

    get isMergingAvailable() {
        if (this.selectCellList.length === 0) {
            return false;
        }

        if ((this.currentMinAndMaxPositions.minColumn === 1 && this.currentMinAndMaxPositions.maxColumn === this.tableExt.numberOfColumns)
            || (this.currentMinAndMaxPositions.minRow === 1 && this.currentMinAndMaxPositions.maxRow === this.tableExt.numberOfRows)) {
            return false;
        }

        const minPositionsCell = this.tableExt.getCell(this.currentMinAndMaxPositions.minRow, this.currentMinAndMaxPositions.minColumn);
        if (minPositionsCell.hasAttribute('rowspan') === true || minPositionsCell.hasAttribute('colspan') === true) {
            const rowspanValue = minPositionsCell.getAttribute('rowspan') ?? 0;
            const colspanValue = minPositionsCell.getAttribute('colspan') ?? 0;

            if (((this.currentMinAndMaxPositions.minRow + (rowspanValue - 1)) === this.currentMinAndMaxPositions.maxRow)
                && (this.currentMinAndMaxPositions.minColumn + (colspanValue - 1)) === this.currentMinAndMaxPositions.maxColumn) {
                return false;
            }
        }

        let returnValue = true;
        rowLoop:
            for (let row = this.currentMinAndMaxPositions.minRow; row <= this.currentMinAndMaxPositions.maxRow; row++) {
                for (let column = this.currentMinAndMaxPositions.minColumn; column <= this.currentMinAndMaxPositions.maxColumn; column++) {
                    const cell = this.tableExt.getCell(row, column);

                    if (cell.classList.contains('d-none') === false && cell.hasAttribute('selected') === false) {
                        returnValue = false;
                        break rowLoop;
                    }
                }
            }

        return returnValue === true;
    }

    get isSplittingAvailable() {
        if (this.hasAlreadyMultipleSelection === true) {
            return this.selectCellList.every((cell) => {
                const cellElem = this.tableExt.getCell(cell.row, cell.column);
                return cellElem.hasAttribute('rowspan') === false && cellElem.hasAttribute('colspan') === false;
            }) === false;
        }

        const focusedCell = this.tableExt.focusedCell;
        if (focusedCell.row === 0 || focusedCell.column === 0) {
            return false;
        }

        const cellElem = this.tableExt.getCell(focusedCell.row, focusedCell.column);
        return cellElem.hasAttribute('rowspan') === true || cellElem.hasAttribute('colspan') === true;
    }

    selectCell(cell) {
        console.log(cell);
        const cellElem = this.tableExt.getCell(
            cell.row,
            cell.column,
        );

        cellElem.setAttribute('selected', 'true');
        this.selectCellList[this.selectCellList.length] = cell;
    }

    selectAllRow(row) {
        this.destroy();

        const rowElem  = this.tableExt.getRow(row);
        const allCells = rowElem.querySelectorAll(`.${CSS.cell}`);

        const activeCells = Array.prototype.filter.call(allCells, (cell) => {
            return cell.classList.contains('d-none') === false;
        });

        const firstCellElem = activeCells[0];
        const lastCellElem  = activeCells[activeCells.length - 1];

        this.selectMultipleRows(
            {row: row, column: (Array.prototype.indexOf.call(allCells, firstCellElem) + 1)},
            {row: row, column: (Array.prototype.indexOf.call(allCells, lastCellElem) + 1)},
        );
    }

    selectMultipleRows(firstCell, lastCell) {
        console.log(firstCell, lastCell);
        this.currentMinAndMaxPositions = this.getCellMinAndMaxPositions(firstCell);
        this.currentMinAndMaxPositions = this.retrieveUpdatedMinAndMaxPositionsCompareToCell(lastCell);

        if (this.hasAlreadyMultipleSelection === true) {
            // Unselect all cells not between min & max positions
            const currentPositions   = this.currentMinAndMaxPositions;
            const toUnselectCellList = this.selectCellList.filter(function (cell) {
                return cell.row > currentPositions.maxRow
                    || cell.row < currentPositions.minRow
                    || cell.column > currentPositions.maxColumn
                    || cell.column < currentPositions.minColumn;
            })

            toUnselectCellList.forEach((cell) => {
                const cellElem = this.tableExt.getCell(cell.row, cell.column)
                cellElem.removeAttribute('selected');
            })
        }

        this.selectCellList = [];
        this.selectCell(firstCell);
        this.selectCell(lastCell);

        // Select all (unselected yet) cells between min & max positions
        this.selectMissingCells(this.currentMinAndMaxPositions);

        const lastCellElem = this.tableExt.getCell(lastCell.row, lastCell.column);
        $.focus(lastCellElem);
    }

    selectMissingCells({minRow, maxRow, minColumn, maxColumn}) {
        console.log({minRow, maxRow, minColumn, maxColumn});
        for (let columnNumber = minColumn; columnNumber <= maxColumn; columnNumber++) {
            for (let rowNumber = minRow; rowNumber <= maxRow; rowNumber++) {
                let cellToMerge = {row: rowNumber, column: columnNumber};

                if (this.isCellSelected(cellToMerge) === false) {
                    this.selectCell(cellToMerge);

                    const cellElem = this.tableExt.getCell(rowNumber, columnNumber);
                    if (cellElem.classList.contains('d-none') === true) {
                        const masterCellInfos = cellElem.getAttribute('data-master-cell').split('_', 2);
                        cellToMerge           = {row: parseInt(masterCellInfos[0]), column: parseInt(masterCellInfos[1])};
                        this.selectCell(cellToMerge);
                    }

                    const previousMinAndMaxPositions = this.currentMinAndMaxPositions;
                    this.currentMinAndMaxPositions   = this.retrieveUpdatedMinAndMaxPositionsCompareToCell(cellToMerge);

                    if (this.currentMinAndMaxPositions.maxRow > previousMinAndMaxPositions.maxRow
                        || this.currentMinAndMaxPositions.maxColumn > previousMinAndMaxPositions.maxColumn
                        || this.currentMinAndMaxPositions.minRow < previousMinAndMaxPositions.minRow
                        || this.currentMinAndMaxPositions.minColumn < previousMinAndMaxPositions.minColumn
                    ) {
                        this.selectMissingCells({
                            minRow   : this.currentMinAndMaxPositions.minRow,
                            maxRow   : this.currentMinAndMaxPositions.maxRow,
                            minColumn: this.currentMinAndMaxPositions.minColumn,
                            maxColumn: this.currentMinAndMaxPositions.maxColumn,
                        });
                    }
                }
            }
        }
    }

    mergeCells() {
        let self = this;

        this.selectCellList.forEach(function (cell) {
            if (cell.row !== self.currentMinAndMaxPositions.minRow || cell.column !== self.currentMinAndMaxPositions.minColumn) {
                let cellElem       = self.tableExt.getCell(cell.row, cell.column);
                cellElem.innerHTML = '';
                cellElem.classList.add('d-none');
                cellElem.setAttribute('data-master-cell', `${self.currentMinAndMaxPositions.minRow}_${self.currentMinAndMaxPositions.minColumn}`);

                cellElem.removeAttribute('colspan');
                cellElem.removeAttribute('rowspan');
            }
        });

        const colspan = (this.currentMinAndMaxPositions.maxColumn - this.currentMinAndMaxPositions.minColumn) + 1;
        const rowspan = (this.currentMinAndMaxPositions.maxRow - this.currentMinAndMaxPositions.minRow) + 1;

        const masterCellElem = this.tableExt.getCell(this.currentMinAndMaxPositions.minRow, this.currentMinAndMaxPositions.minColumn);

        masterCellElem.setAttribute('colspan', `${colspan}`);
        masterCellElem.setAttribute('rowspan', `${rowspan}`);

        this.destroy();
    }

    /**
     * @param {{row: number, column: number}} cell
     */
    splitCell(cell) {
        const cellElem = this.tableExt.getCell(cell.row, cell.column);

        const rowSpan = parseInt(cellElem.getAttribute('rowspan')) - 1;
        const colSpan = parseInt(cellElem.getAttribute('colspan')) - 1;

        for (let rowNumber = cell.row; rowNumber <= (cell.row + rowSpan); rowNumber++) {
            for (let columnNumber = cell.column; columnNumber <= (cell.column + colSpan); columnNumber++) {
                let cellElemToUnmerge = this.tableExt.getCell(rowNumber, columnNumber);
                if (cellElemToUnmerge !== cellElem) {
                    cellElemToUnmerge.classList.remove('d-none');
                    cellElemToUnmerge.removeAttribute('data-master-cell');
                }
            }
        }

        cellElem.removeAttribute('rowspan');
        cellElem.removeAttribute('colspan');
    }

    splitCellsInSelection() {
        if (this.hasAlreadyMultipleSelection === false) {
            return;
        }

        this.selectCellList.forEach((cell) => this.splitCell({row: cell.row, column: cell.column}));
    }

    /**
     *
     * @param cell
     * @return {{minRow: number, minColumn: number, maxRow: number, maxColumn: number}}
     */
    getCellMinAndMaxPositions(cell) {
        let minRow, maxRow, minColumn, maxColumn = null;

        const cellElem = this.tableExt.getCell(cell.row, cell.column);
        if (cellElem.hasAttribute('rowspan') === true) {
            minRow = cell.row;
            maxRow = cell.row + (parseInt(cellElem.getAttribute('rowspan')) - 1);
        } else {
            minRow = maxRow = cell.row;
        }

        if (cellElem.hasAttribute('colspan') === true) {
            minColumn = cell.column;
            maxColumn = cell.column + (parseInt(cellElem.getAttribute('colspan')) - 1);
        } else {
            minColumn = maxColumn = cell.column;
        }

        return {
            minRow   : minRow,
            maxRow   : maxRow,
            minColumn: minColumn,
            maxColumn: maxColumn,
        }
    }

    destroy() {
        let self = this;
        this.selectCellList.forEach((cell) => {
            const cellElem = self.tableExt.getCell(cell.row, cell.column)
            cellElem.removeAttribute('selected');
        });

        this.selectCellList = [];

        this.minSelectedRow
            = this.maxSelectedRow
            = this.minSelectedColumn
            = this.maxSelectedColumn
            = null;
    }

    isCellSelected(cellToSearch) {
        return this.selectCellList.some(function (cell) {
            return cell.row === cellToSearch.row && cell.column === cellToSearch.column;
        });
    }

    /**
     * @param {{minRow: number, maxRow: number, minColumn: number, maxColumn: number}} positions
     */
    set currentMinAndMaxPositions(positions) {
        this.minSelectedRow    = positions.minRow;
        this.maxSelectedRow    = positions.maxRow;
        this.minSelectedColumn = positions.minColumn;
        this.maxSelectedColumn = positions.maxColumn;
    }

    /**
     * @param {{row: number, column: number}} cellToCompare
     *
     * @return {{minRow: number, minColumn: number, maxRow: number, maxColumn: number}}
     */
    retrieveUpdatedMinAndMaxPositionsCompareToCell(cellToCompare) {
        const currentPositions                       = this.currentMinAndMaxPositions;
        const {minRow, maxRow, minColumn, maxColumn} = this.getCellMinAndMaxPositions(cellToCompare);

        if (currentPositions.minRow === currentPositions.maxRow === currentPositions.maxColumn === currentPositions.minColumn === null) {
            return {
                minRow   : minRow,
                maxRow   : maxRow,
                minColumn: minColumn,
                maxColumn: maxColumn,
            }
        }

        return {
            minRow   : minRow < currentPositions.minRow ? minRow : currentPositions.minRow,
            maxRow   : maxRow > currentPositions.maxRow ? maxRow : currentPositions.maxRow,
            minColumn: minColumn < currentPositions.minColumn ? minColumn : currentPositions.minColumn,
            maxColumn: maxColumn > currentPositions.maxColumn ? maxColumn : currentPositions.maxColumn
        };
    }
}
