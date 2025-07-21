import React, { useState, useMemo } from 'react';

export default function BCCard({ bc, onClose }) {
  const [showKT, setShowKT] = useState(true);
  const [serviceFilter, setServiceFilter] = useState('all');

  const allServices = useMemo(() => {
    return bc.companies.flatMap(company => company.services.map(s => ({
      ...s,
      isKT: company.is_kt_client,
      company: company.organization_name
    })));
  }, [bc]);

  const serviceOptions = useMemo(() => {
    return [...new Set(allServices.map(s => s.name))];
  }, [allServices]);

  const filtered = useMemo(() => {
    return allServices.filter(s =>
      (showKT || !s.isKT) &&
      (serviceFilter === 'all' || s.name === serviceFilter)
    );
  }, [allServices, showKT, serviceFilter]);

  const totalRevenue = filtered.reduce((sum, s) => sum + (s.revenue || 0), 0);

  return (
    <div className="fixed right-4 top-4 bg-white rounded-lg shadow-lg p-4 w-96 z-[1000]">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-semibold">{bc.business_center_name}</h2>
        <button onClick={onClose} className="text-gray-500 hover:text-red-500">✕</button>
      </div>

      <div className="mb-2">
        <label className="inline-flex items-center space-x-2">
          <input type="checkbox" checked={showKT} onChange={() => setShowKT(!showKT)} />
          <span>Показать КТ</span>
        </label>
      </div>

      <div className="mb-2">
        <select
          className="w-full border rounded px-2 py-1"
          value={serviceFilter}
          onChange={e => setServiceFilter(e.target.value)}
        >
          <option value="all">Все услуги</option>
          {serviceOptions.map(opt => (
            <option key={opt} value={opt}>{opt}</option>
          ))}
        </select>
      </div>

      <div className="mb-2 font-medium">
        Общая выручка: <span className="text-green-600">{totalRevenue.toLocaleString()} тг</span>
      </div>

      <ul className="text-sm space-y-1 max-h-40 overflow-y-auto">
        {filtered.map((s, i) => (
          <li key={i} className="flex justify-between border-b pb-1">
            <span>{s.name}</span>
            <span>{s.revenue?.toLocaleString() || 0} тг</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
