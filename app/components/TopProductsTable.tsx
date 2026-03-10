// app/components/TopProductsTable.tsx
import React from 'react';

type Product = {
  name: string;
  qty: number;
};

type Props = {
  products: Product[];
};

export default function TopProductsTable({ products }: Props) {
  return (
    <div className="max-w-full overflow-x-auto bg-white shadow rounded-lg p-4">
      <table className="w-full table-auto">
        <thead>
          <tr className="bg-gray-100">
            <th className="text-left py-2 px-4">Name</th>
            <th className="text-right py-2 px-4">Total Quantity Sold</th>
          </tr>
        </thead>
        <tbody>
          {products.map((p, i) => (
            <tr
              key={i}
              className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50'}
            >
              <td className="py-2 px-4">{p.name}</td>
              <td className="py-2 px-4 text-right">
                {p.qty.toLocaleString()}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}