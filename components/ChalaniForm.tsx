import React, { useState, useEffect, useCallback } from 'react';
import { Input } from './Input';
import { NepaliDatePicker } from './NepaliDatePicker';
import { Chalani, User, ChalaniTable } from '../types/coreTypes';
import { Save, X, Table as TableIcon, Plus, Trash2, Info } from 'lucide-react';
import { getEvaluatedCell } from '../lib/tableUtils';
// @ts-ignore
import NepaliDate from 'nepali-date-converter';

interface ChalaniFormProps {
  onSave: (chalaniData: Omit<Chalani, 'id' | 'dispatchNumber' | 'fiscalYear'>) => void;
  onCancel: () => void;
  nextDispatchNumber: string;
  currentUser: User;
  initialData?: Chalani;
}

export const ChalaniForm: React.FC<ChalaniFormProps> = ({ onSave, onCancel, nextDispatchNumber, currentUser, initialData }) => {
  const getInitialFormData = () => {
    if (initialData) {
      return {
        date: initialData.date,
        recipient: initialData.recipient,
        recipientAddress: initialData.recipientAddress || '',
        subject: initialData.subject,
        sender: initialData.sender,
        letterContent: initialData.letterContent,
        remarks: initialData.remarks,
        tableData: initialData.tableData,
      };
    }

    let today = '';
    try {
      today = new NepaliDate().format('YYYY-MM-DD');
    } catch (e) {}
    return {
      date: today,
      recipient: '',
      recipientAddress: '',
      subject: '',
      sender: currentUser.fullName,
      letterContent: '',
      remarks: '',
      tableData: undefined as ChalaniTable | undefined,
    };
  };

  const [formData, setFormData] = useState(getInitialFormData());
  const [showTableBuilder, setShowTableBuilder] = useState(!!initialData?.tableData);

  const [editingCell, setEditingCell] = useState<{ r: number, c: number } | null>(null);

  const [resizingCol, setResizingCol] = useState<{ index: number, startX: number, startWidth: number } | null>(null);
  const [resizingRow, setResizingRow] = useState<{ index: number, startY: number, startHeight: number } | null>(null);

  const onMouseMove = useCallback((e: MouseEvent) => {
    if (resizingCol && formData.tableData) {
      const diff = e.clientX - resizingCol.startX;
      const newWidths = [...(formData.tableData.columnWidths || formData.tableData.headers.map(() => 120))];
      newWidths[resizingCol.index] = Math.max(50, resizingCol.startWidth + diff);
      setFormData({
        ...formData,
        tableData: { ...formData.tableData, columnWidths: newWidths }
      });
    } else if (resizingRow && formData.tableData) {
      const diff = e.clientY - resizingRow.startY;
      const newHeights = [...(formData.tableData.rowHeights || formData.tableData.rows.map(() => 40))];
      newHeights[resizingRow.index] = Math.max(30, resizingRow.startHeight + diff);
      setFormData({
        ...formData,
        tableData: { ...formData.tableData, rowHeights: newHeights }
      });
    }
  }, [resizingCol, resizingRow, formData]);

  const onMouseUp = useCallback(() => {
    setResizingCol(null);
    setResizingRow(null);
  }, []);

  useEffect(() => {
    if (resizingCol || resizingRow) {
      window.addEventListener('mousemove', onMouseMove);
      window.addEventListener('mouseup', onMouseUp);
    } else {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    }
    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };
  }, [resizingCol, resizingRow, onMouseMove, onMouseUp]);

  const indexToColumnName = (index: number) => {
    let name = '';
    while (index >= 0) {
      name = String.fromCharCode((index % 26) + 65) + name;
      index = Math.floor(index / 26) - 1;
    }
    return name;
  };

  const insertCellReference = (r: number, c: number) => {
    if (editingCell && formData.tableData) {
      const { r: editR, c: editC } = editingCell;
      // Don't refer to self
      if (editR === r && editC === c) return;

      const currentVal = formData.tableData.rows[editR][editC];
      if (currentVal.startsWith('=')) {
        const ref = `${indexToColumnName(c)}${r + 1}`;
        const newVal = currentVal + ref;
        updateTableCell(editR, editC, newVal);
      }
    }
  };

  const handleCellClick = (r: number, c: number, e: React.MouseEvent) => {
    if (editingCell && (editingCell.r !== r || editingCell.c !== c)) {
      const currentVal = formData.tableData?.rows[editingCell.r][editingCell.c];
      if (currentVal?.startsWith('=')) {
        e.preventDefault();
        e.stopPropagation();
        insertCellReference(r, c);
        return;
      }
    }
    setEditingCell({ r, c });
  };

  useEffect(() => {
    if (initialData) {
      setFormData({
        date: initialData.date,
        recipient: initialData.recipient,
        recipientAddress: initialData.recipientAddress || '',
        subject: initialData.subject,
        sender: initialData.sender,
        letterContent: initialData.letterContent,
        remarks: initialData.remarks,
        tableData: initialData.tableData,
      });
      setShowTableBuilder(!!initialData.tableData);
    }
  }, [initialData]);

  const handleAddTable = () => {
    const defaultTable: ChalaniTable = {
      headers: ['सि.नं.', 'विवरण'],
      rows: [['1', '']]
    };
    setFormData({ ...formData, tableData: defaultTable });
    setShowTableBuilder(true);
  };

  const updateTableHeader = (index: number, value: string) => {
    if (!formData.tableData) return;
    const newHeaders = [...formData.tableData.headers];
    newHeaders[index] = value;
    setFormData({
      ...formData,
      tableData: { ...formData.tableData, headers: newHeaders }
    });
  };

  const updateTableCell = (rowIndex: number, colIndex: number, value: string) => {
    if (!formData.tableData) return;
    const newRows = [...formData.tableData.rows];
    newRows[rowIndex] = [...newRows[rowIndex]];
    newRows[rowIndex][colIndex] = value;
    setFormData({
      ...formData,
      tableData: { ...formData.tableData, rows: newRows }
    });
  };

  const addRow = () => {
    if (!formData.tableData) return;
    const newRow = new Array(formData.tableData.headers.length).fill('');
    setFormData({
      ...formData,
      tableData: { ...formData.tableData, rows: [...formData.tableData.rows, newRow] }
    });
  };

  const removeRow = (index: number) => {
    if (!formData.tableData || formData.tableData.rows.length <= 1) return;
    const newRows = formData.tableData.rows.filter((_, i) => i !== index);
    setFormData({
      ...formData,
      tableData: { ...formData.tableData, rows: newRows }
    });
  };

  const addColumn = () => {
    if (!formData.tableData) return;
    setFormData({
      ...formData,
      tableData: {
        headers: [...formData.tableData.headers, 'नयाँ महल'],
        rows: formData.tableData.rows.map(row => [...row, ''])
      }
    });
  };

  const removeColumn = (index: number) => {
    if (!formData.tableData || formData.tableData.headers.length <= 1) return;
    setFormData({
      ...formData,
      tableData: {
        headers: formData.tableData.headers.filter((_, i) => i !== index),
        rows: formData.tableData.rows.map(row => row.filter((_, i) => i !== index))
      }
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
    setFormData(getInitialFormData()); // Reset for next entry
  };

  return (
    <form onSubmit={handleSubmit} className="grid md:grid-cols-2 gap-6">
      <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
        <label className="block text-sm font-bold text-slate-500 mb-1">चलानी नम्बर</label>
        <p className="font-black text-2xl text-primary-600">{initialData?.dispatchNumber || nextDispatchNumber}</p>
      </div>
      <NepaliDatePicker
        label="मिति"
        value={formData.date}
        onChange={val => setFormData({ ...formData, date: val })}
        required
      />
      <Input
        label="पाउने व्यक्ति/कार्यालय"
        value={formData.recipient}
        onChange={e => setFormData({ ...formData, recipient: e.target.value })}
        required
      />
      <Input
        label="ठेगाना"
        value={formData.recipientAddress}
        onChange={e => setFormData({ ...formData, recipientAddress: e.target.value })}
        placeholder="पठाइएको व्यक्तिको ठेगाना"
      />
      <Input
        label="बिषय"
        value={formData.subject}
        onChange={e => setFormData({ ...formData, subject: e.target.value })}
        required
      />
      <Input
        label="पठाउने व्यक्ति/शाखा"
        value={formData.sender}
        onChange={e => setFormData({ ...formData, sender: e.target.value })}
        required
        disabled
      />
      <div className="md:col-span-2">
        <label className="block text-sm font-bold text-slate-700 mb-1">पत्रको व्यहोरा (Letter Content)</label>
        <textarea
          value={formData.letterContent || ''}
          onChange={e => setFormData({ ...formData, letterContent: e.target.value })}
          className="w-full p-4 rounded-xl border border-slate-300 focus:border-primary-500 focus:ring-4 focus:ring-primary-500/10 outline-none transition-all font-nepali min-h-[150px]"
          rows={6}
          placeholder="पत्रको मुख्य व्यहोरा यहाँ लेख्नुहोस्..."
        />
      </div>

      <div className="md:col-span-2 space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-2">
            <label className="block text-sm font-bold text-slate-700">तपशिल (तालिका)</label>
            {!showTableBuilder ? (
                <button 
                    type="button"
                    onClick={handleAddTable}
                    className="text-xs flex items-center gap-1 px-3 py-1 bg-indigo-50 text-indigo-600 hover:bg-indigo-100 rounded-lg transition-colors font-semibold"
                >
                    <TableIcon size={14} /> तालिका थप्नुहोस्
                </button>
            ) : (
                <button 
                    type="button"
                    onClick={() => {
                        setShowTableBuilder(false);
                        setFormData({ ...formData, tableData: undefined });
                    }}
                    className="text-xs flex items-center gap-1 px-3 py-1 bg-red-50 text-red-600 hover:bg-red-100 rounded-lg transition-colors font-semibold"
                >
                    <Trash2 size={14} /> तालिका हटाउनुहोस्
                </button>
            )}
        </div>

        {showTableBuilder && formData.tableData && (
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 overflow-x-auto">
                <table className="w-full text-sm border-collapse bg-white">
                    <thead>
                        <tr className="bg-transparent">
                            <th className="border border-slate-300 p-1 w-10 text-[10px] text-slate-400">#</th>
                            {formData.tableData.headers.map((_, i) => (
                                <th 
                                    key={i} 
                                    className="border border-slate-300 p-1 text-[10px] text-slate-400 font-mono relative"
                                    style={{ width: formData.tableData?.columnWidths?.[i] || 120, minWidth: formData.tableData?.columnWidths?.[i] || 120 }}
                                >
                                    {indexToColumnName(i)}
                                    <div 
                                        className="absolute top-0 right-0 w-1 h-full cursor-col-resize hover:bg-primary-400 active:bg-primary-600 z-20"
                                        onMouseDown={(e) => {
                                            e.preventDefault();
                                            setResizingCol({
                                                index: i,
                                                startX: e.clientX,
                                                startWidth: formData.tableData?.columnWidths?.[i] || 120
                                            });
                                        }}
                                    />
                                </th>
                            ))}
                            <th className="border border-slate-300 bg-transparent w-10"></th>
                        </tr>
                        <tr>
                            <th className="border border-slate-300 bg-transparent"></th>
                            {formData.tableData.headers.map((header, i) => (
                                <th 
                                    key={i} 
                                    className="border border-slate-300 p-1 group relative"
                                    style={{ width: formData.tableData?.columnWidths?.[i] || 120, minWidth: formData.tableData?.columnWidths?.[i] || 120 }}
                                >
                                    <div className="flex items-center gap-1">
                                        <input 
                                            type="text"
                                            value={header}
                                            onChange={(e) => updateTableHeader(i, e.target.value)}
                                            className="w-full font-bold text-center border-none focus:ring-0 p-1 bg-transparent"
                                            placeholder="Header"
                                        />
                                        <button 
                                            type="button"
                                            onClick={() => removeColumn(i)}
                                            className="text-red-400 hover:text-red-600 p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                                        >
                                            <X size={12} />
                                        </button>
                                    </div>
                                    <div 
                                        className="absolute top-0 right-0 w-1 h-full cursor-col-resize hover:bg-primary-400 active:bg-primary-600 z-20"
                                        onMouseDown={(e) => {
                                            e.preventDefault();
                                            setResizingCol({
                                                index: i,
                                                startX: e.clientX,
                                                startWidth: formData.tableData?.columnWidths?.[i] || 120
                                            });
                                        }}
                                    />
                                </th>
                            ))}
                            <th className="border border-slate-300 p-1 bg-transparent w-10">
                                <button 
                                    type="button"
                                    onClick={addColumn}
                                    className="p-1 text-primary-600 hover:bg-primary-50 rounded"
                                    title="Add Column"
                                >
                                    <Plus size={16} />
                                </button>
                            </th>
                        </tr>
                    </thead>
                    <tbody>
                        {formData.tableData.rows.map((row, rowIndex) => (
                            <tr key={rowIndex} style={{ height: formData.tableData?.rowHeights?.[rowIndex] || 40 }}>
                                <td className="border border-slate-300 bg-transparent text-[10px] text-center text-slate-400 font-mono font-bold relative">
                                    {rowIndex + 1}
                                    <div 
                                        className="absolute bottom-0 left-0 w-full h-1 cursor-row-resize hover:bg-primary-400 active:bg-primary-600 z-20"
                                        onMouseDown={(e) => {
                                            e.preventDefault();
                                            setResizingRow({
                                                index: rowIndex,
                                                startY: e.clientY,
                                                startHeight: formData.tableData?.rowHeights?.[rowIndex] || 40
                                            });
                                        }}
                                    />
                                </td>
                                {row.map((cell, cellIndex) => {
                                    const isEditing = editingCell?.r === rowIndex && editingCell?.c === cellIndex;
                                    const isFormula = cell && cell.toString().startsWith('=');
                                    const evaluatedValue = isFormula ? getEvaluatedCell(formData.tableData!.rows, cellIndex, rowIndex) : cell;

                                    return (
                                        <td 
                                            key={cellIndex} 
                                            className={`border border-slate-300 p-0 relative group ${!isEditing && isFormula ? 'cursor-pointer' : ''}`}
                                            style={{ width: formData.tableData?.columnWidths?.[cellIndex] || 120, minWidth: formData.tableData?.columnWidths?.[cellIndex] || 120 }}
                                            onMouseDown={(e) => {
                                                if (editingCell && (editingCell.r !== rowIndex || editingCell.c !== cellIndex)) {
                                                    const sourceVal = formData.tableData?.rows[editingCell.r][editingCell.c];
                                                    if (sourceVal?.toString().startsWith('=')) {
                                                        const target = e.target as HTMLElement;
                                                        if (!target.classList.contains('cursor-col-resize') && !target.classList.contains('cursor-row-resize')) {
                                                            e.preventDefault();
                                                            insertCellReference(rowIndex, cellIndex);
                                                        }
                                                    }
                                                }
                                            }}
                                        >
                                            <input 
                                                type="text"
                                                value={isEditing ? cell : (isFormula ? evaluatedValue : cell)}
                                                onChange={(e) => updateTableCell(rowIndex, cellIndex, e.target.value)}
                                                onFocus={() => setEditingCell({ r: rowIndex, c: cellIndex })}
                                                onBlur={(e) => {
                                                    setEditingCell(null);
                                                }}
                                                onKeyDown={(e) => {
                                                    if (e.key === 'Enter') {
                                                        e.preventDefault();
                                                        (e.target as HTMLInputElement).blur();
                                                    }
                                                }}
                                                className={`w-full h-full border-none focus:ring-1 focus:ring-primary-500 px-2 flex items-center ${isFormula && !isEditing ? 'text-primary-700 font-semibold' : ''}`}
                                            />
                                            {isFormula && !isEditing && (
                                                <div className="absolute top-0 right-1 p-1 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                                                    <Info size={10} className="text-primary-400" />
                                                </div>
                                            )}
                                        </td>
                                    );
                                })}
                                <td className="border border-slate-300 p-1 text-center bg-transparent relative">
                                    <button 
                                        type="button"
                                        onClick={() => removeRow(rowIndex)}
                                        className="text-red-400 hover:text-red-600 p-1"
                                        title="Remove Row"
                                    >
                                        <X size={14} />
                                    </button>
                                    <div 
                                        className="absolute bottom-0 left-0 w-full h-1 cursor-row-resize hover:bg-primary-400 active:bg-primary-600 z-20"
                                        onMouseDown={(e) => {
                                            e.preventDefault();
                                            setResizingRow({
                                                index: rowIndex,
                                                startY: e.clientY,
                                                startHeight: formData.tableData?.rowHeights?.[rowIndex] || 40
                                            });
                                        }}
                                    />
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                <button 
                    type="button"
                    onClick={addRow}
                    className="mt-2 w-full flex items-center justify-center gap-1 py-1 px-3 bg-white border border-dashed border-slate-300 text-slate-500 hover:text-primary-600 hover:border-primary-500 rounded-lg transition-all text-xs font-semibold"
                >
                    <Plus size={14} /> थप हरफ
                </button>
            </div>
        )}
      </div>

      <div className="md:col-span-2">
        <label className="block text-sm font-bold text-slate-700 mb-1">कैफियत</label>
        <textarea
          value={formData.remarks}
          onChange={e => setFormData({ ...formData, remarks: e.target.value })}
          className="w-full p-3 rounded-lg border border-slate-300 focus:border-primary-500 focus:ring-4 focus:ring-primary-500/10 outline-none transition-all"
          rows={3}
          placeholder="केहि भएमा उल्लेख गर्नुहोस्..."
        />
      </div>
      <div className="md:col-span-2 flex justify-end gap-3 pt-4 border-t border-slate-100">
        <button
          type="button"
          onClick={onCancel}
          className="flex items-center gap-2 px-6 py-2 bg-slate-100 text-slate-700 hover:bg-slate-200 rounded-lg shadow-sm transition-all active:scale-95 font-medium"
        >
          <X size={18} />
          <span>रद्द</span>
        </button>
        <button
          type="submit"
          className="flex items-center gap-2 px-6 py-2 bg-primary-600 text-white hover:bg-primary-700 rounded-lg shadow-sm transition-all active:scale-95 font-medium"
        >
          <Save size={18} />
          <span>सुरक्षित गर्नुहोस्</span>
        </button>
      </div>
    </form>
  );
};
