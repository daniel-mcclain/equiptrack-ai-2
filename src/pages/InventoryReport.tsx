import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Download,
  Filter,
  Search,
  AlertTriangle,
  Package,
  ArrowUpDown,
  FileText,
  RefreshCw
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../hooks/useAuth';
import { format, subMonths } from 'date-fns';
import { jsPDF } from 'jspdf';
import 'jspdf-autotable';

interface Part {
  id: string;
  part_number: string;
  description: string;
  unit_cost: number;
  quantity_in_stock: number;
  reorder_point: number;
  category: string | null;
  manufacturer: string | null;
  storage_location: string;
  supplier: string;
  is_critical: boolean;
  min_stock: number;
  max_stock: number;
  last_ordered: string | null;
  last_received: string | null;
  usage_history: {
    month: string;
    quantity: number;
  }[];
}

interface PartPurchase {
  purchase_date: string;
  quantity: number;
  purchase_price: number;
  supplier: string;
}

const InventoryReport = () => {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [parts, setParts] = useState<Part[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState({
    category: '',
    supplier: '',
    stockStatus: '', // 'all', 'low', 'out'
    critical: false
  });
  const [sortConfig, setSortConfig] = useState({
    key: 'part_number',
    direction: 'asc'
  });
  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      if (!isAuthenticated) {
        setLoading(false);
        return;
      }

      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('No user found');

        const { data: company } = await supabase
          .from('companies')
          .select('id')
          .eq('owner_id', user.id)
          .single();

        if (!company) throw new Error('No company found');

        // Get parts inventory
        const { data: partsData, error: partsError } = await supabase
          .from('parts_inventory')
          .select('*')
          .eq('company_id', company.id);

        if (partsError) throw partsError;

        // Get purchase history for the past 12 months
        const startDate = subMonths(new Date(), 12);
        const { data: purchasesData, error: purchasesError } = await supabase
          .from('part_purchases')
          .select('part_id, purchase_date, quantity, purchase_price, supplier')
          .eq('company_id', company.id)
          .gte('purchase_date', startDate.toISOString());

        if (purchasesError) throw purchasesError;

        // Get work order parts usage
        const { data: usageData, error: usageError } = await supabase
          .from('work_order_parts')
          .select(`
            part_id,
            quantity,
            created_at,
            work_order:work_order_id (
              created_at
            )
          `)
          .gte('created_at', startDate.toISOString());

        if (usageError) throw usageError;

        // Process and combine the data
        const enrichedParts = partsData?.map(part => {
          // Calculate usage history by month
          const usageHistory = Array.from({ length: 12 }, (_, i) => {
            const month = format(subMonths(new Date(), i), 'yyyy-MM');
            const usage = usageData
              ?.filter(u => u.part_id === part.id && 
                format(new Date(u.work_order.created_at), 'yyyy-MM') === month)
              ?.reduce((sum, u) => sum + u.quantity, 0) || 0;
            return { month, quantity: usage };
          }).reverse();

          // Get last purchase info
          const purchases = purchasesData
            ?.filter(p => p.part_id === part.id)
            ?.sort((a, b) => new Date(b.purchase_date).getTime() - new Date(a.purchase_date).getTime());

          const lastPurchase = purchases?.[0];

          return {
            ...part,
            usage_history: usageHistory,
            last_ordered: lastPurchase?.purchase_date || null,
            last_received: lastPurchase?.purchase_date || null,
            supplier: lastPurchase?.supplier || 'Unknown'
          };
        });

        setParts(enrichedParts || []);
      } catch (err: any) {
        console.error('Error:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [isAuthenticated]);

  const refreshData = async () => {
    setIsRefreshing(true);
    await fetchData();
    setTimeout(() => setIsRefreshing(false), 500);
  };

  const handleSort = (key: keyof Part) => {
    setSortConfig(prev => ({
      key,
      direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc'
    }));
  };

  const filteredParts = parts
    .filter(part => {
      const matchesSearch = (
        part.part_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
        part.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (part.manufacturer && part.manufacturer.toLowerCase().includes(searchTerm.toLowerCase()))
      );
      const matchesCategory = !filters.category || part.category === filters.category;
      const matchesSupplier = !filters.supplier || part.supplier === filters.supplier;
      const matchesStockStatus = !filters.stockStatus ? true :
        filters.stockStatus === 'low' ? part.quantity_in_stock <= part.reorder_point :
        filters.stockStatus === 'out' ? part.quantity_in_stock === 0 : true;
      const matchesCritical = !filters.critical || part.is_critical;

      return matchesSearch && matchesCategory && matchesSupplier && matchesStockStatus && matchesCritical;
    })
    .sort((a, b) => {
      const key = sortConfig.key as keyof Part;
      const direction = sortConfig.direction === 'asc' ? 1 : -1;
      if (a[key] < b[key]) return -1 * direction;
      if (a[key] > b[key]) return 1 * direction;
      return 0;
    });

  const categories = Array.from(new Set(parts.map(p => p.category).filter(Boolean)));
  const suppliers = Array.from(new Set(parts.map(p => p.supplier).filter(Boolean)));

  const totalQuantity = filteredParts.reduce((sum, part) => sum + part.quantity_in_stock, 0);
  const totalValue = filteredParts.reduce((sum, part) => sum + (part.quantity_in_stock * part.unit_cost), 0);

  const exportToPDF = () => {
    const doc = new jsPDF();
    
    // Add title
    doc.setFontSize(20);
    doc.text('Parts Inventory Report', 14, 20);
    doc.setFontSize(10);
    doc.text(`Generated on ${new Date().toLocaleDateString()}`, 14, 30);

    // Add summary
    doc.text(`Total Parts: ${filteredParts.length}`, 14, 40);
    doc.text(`Total Quantity: ${totalQuantity}`, 14, 45);
    doc.text(`Total Value: $${totalValue.toFixed(2)}`, 14, 50);

    // Add table
    (doc as any).autoTable({
      startY: 60,
      head: [[
        'Part Number',
        'Description',
        'In Stock',
        'Reorder Point',
        'Unit Cost',
        'Total Value',
        'Location',
        'Supplier'
      ]],
      body: filteredParts.map(part => [
        part.part_number,
        part.description,
        part.quantity_in_stock,
        part.reorder_point,
        `$${part.unit_cost.toFixed(2)}`,
        `$${(part.quantity_in_stock * part.unit_cost).toFixed(2)}`,
        part.storage_location,
        part.supplier
      ]),
      styles: { fontSize: 8 },
      headStyles: { fillColor: [59, 130, 246] }
    });

    doc.save('inventory-report.pdf');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div>
      {!isAuthenticated && (
        <div className="mb-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
          <p className="text-sm text-blue-800">
            👋 Welcome to the demo! You're viewing sample inventory data. 
            <a href="/auth" className="ml-2 font-medium underline">Sign in</a> to manage your inventory.
          </p>
        </div>
      )}

      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Parts Inventory Report</h1>
        <div className="flex space-x-4">
          <button
            onClick={refreshData}
            className={`p-2 text-gray-500 hover:text-gray-700 rounded-full transition-transform ${
              isRefreshing && "animate-spin"
            }`}
            title="Refresh data"
          >
            <RefreshCw className="h-5 w-5" />
          </button>
          <button
            onClick={exportToPDF}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700"
          >
            <Download className="h-5 w-5 mr-2" />
            Export Report
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-sm text-red-600">{error}</p>
        </div>
      )}

      <div className="bg-white rounded-lg shadow">
        <div className="p-6">
          <div className="flex flex-col sm:flex-row justify-between items-center mb-6 space-y-4 sm:space-y-0">
            <div className="flex items-center space-x-4 w-full sm:w-auto">
              <div className="relative flex-1 sm:flex-none">
                <input
                  type="text"
                  placeholder="Search parts..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full sm:w-64 pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                />
                <Search className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
              </div>

              <select
                value={filters.category}
                onChange={(e) => setFilters(prev => ({ ...prev, category: e.target.value }))}
                className="border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">All Categories</option>
                {categories.map(category => (
                  <option key={category} value={category}>{category}</option>
                ))}
              </select>

              <select
                value={filters.supplier}
                onChange={(e) => setFilters(prev => ({ ...prev, supplier: e.target.value }))}
                className="border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">All Suppliers</option>
                {suppliers.map(supplier => (
                  <option key={supplier} value={supplier}>{supplier}</option>
                ))}
              </select>

              <select
                value={filters.stockStatus}
                onChange={(e) => setFilters(prev => ({ ...prev, stockStatus: e.target.value }))}
                className="border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">All Stock Status</option>
                <option value="low">Low Stock</option>
                <option value="out">Out of Stock</option>
              </select>

              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={filters.critical}
                  onChange={(e) => setFilters(prev => ({ ...prev, critical: e.target.checked }))}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <span className="ml-2 text-sm text-gray-700">Critical Parts Only</span>
              </label>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th 
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                    onClick={() => handleSort('part_number')}
                  >
                    <div className="flex items-center">
                      Part Number
                      <ArrowUpDown className="ml-1 h-4 w-4" />
                    </div>
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Description
                  </th>
                  <th 
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                    onClick={() => handleSort('quantity_in_stock')}
                  >
                    <div className="flex items-center">
                      In Stock
                      <ArrowUpDown className="ml-1 h-4 w-4" />
                    </div>
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Reorder Point
                  </th>
                  <th 
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                    onClick={() => handleSort('unit_cost')}
                  >
                    <div className="flex items-center">
                      Unit Cost
                      <ArrowUpDown className="ml-1 h-4 w-4" />
                    </div>
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Total Value
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Location
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Supplier
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Last Ordered
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Usage (12m)
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredParts.map(part => {
                  const isBelowReorder = part.quantity_in_stock <= part.reorder_point;
                  const totalUsage = part.usage_history.reduce((sum, month) => sum + month.quantity, 0);
                  
                  return (
                    <tr key={part.id} className={isBelowReorder ? 'bg-red-50' : ''}>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          {part.is_critical && (
                            <AlertTriangle className="h-4 w-4 text-yellow-500 mr-2" />
                          )}
                          <span className="font-medium text-gray-900">{part.part_number}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-gray-900">{part.description}</div>
                        {part.manufacturer && (
                          <div className="text-sm text-gray-500">{part.manufacturer}</div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          isBelowReorder
                            ? 'bg-red-100 text-red-800'
                            : 'bg-green-100 text-green-800'
                        }`}>
                          {part.quantity_in_stock}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {part.reorder_point}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        ${part.unit_cost.toFixed(2)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        ${(part.quantity_in_stock * part.unit_cost).toFixed(2)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {part.storage_location}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {part.supplier}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {part.last_ordered ? format(new Date(part.last_ordered), 'MMM d, yyyy') : '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center space-x-2">
                          <span className="text-sm text-gray-500">{totalUsage}</span>
                          <div className="flex-1 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                            {part.usage_history.map((month, index) => (
                              <div
                                key={month.month}
                                className="h-full bg-blue-600"
                                style={{
                                  width: `${(month.quantity / Math.max(...part.usage_history.map(m => m.quantity))) * 100}%`,
                                  opacity: 0.3 + (index / part.usage_history.length) * 0.7
                                }}
                              />
                            ))}
                          </div>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot className="bg-gray-50">
                <tr>
                  <td colSpan={2} className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    Totals
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {totalQuantity}
                  </td>
                  <td></td>
                  <td></td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    ${totalValue.toFixed(2)}
                  </td>
                  <td colSpan={4}></td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default InventoryReport;