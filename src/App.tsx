import { FormEvent, useCallback, useEffect, useMemo, useState } from 'react';
import { BarChart3, Building2, Check, CheckCircle2, ChevronDown, CircleDollarSign, Clock, CreditCard, Download, Edit3, FileBarChart, FileText, Hotel, LayoutDashboard, MapPin, Plus, Printer, Receipt, Search, Settings2, ShieldCheck, Tags, Trash2, Users, Wallet, Wifi, X, Zap } from 'lucide-react';
import { supabase } from '@/lib/supabase';

type Category = 'Listrik' | 'Air' | 'Internet/WiFi' | 'Kebersihan' | 'Perawatan & Perbaikan' | 'Gaji Karyawan' | 'Perlengkapan Kos' | 'Biaya Lainnya';
type PaymentStatus = 'Lunas' | 'Belum Lunas' | 'Sebagian';
type PaymentMethod = 'Tunai' | 'Transfer Bank' | 'QRIS' | 'Debit' | 'Lainnya';
type Expense = {
  id: string;
  transaction_date: string;
  transaction_number: string;
  description: string;
  category: Category;
  amount: number;
  status: PaymentStatus;
  payment_method: PaymentMethod;
  created_at: string;
};
type FormState = {
  transaction_date: string;
  transaction_number: string;
  description: string;
  category: Category;
  amount: string;
  status: PaymentStatus;
  payment_method: PaymentMethod;
};
type Tab = 'dashboard' | 'transaksi' | 'laporan' | 'kategori' | 'pengaturan';

const categories: Category[] = ['Listrik', 'Air', 'Internet/WiFi', 'Kebersihan', 'Perawatan & Perbaikan', 'Gaji Karyawan', 'Perlengkapan Kos', 'Biaya Lainnya'];
const paymentMethods: PaymentMethod[] = ['Tunai', 'Transfer Bank', 'QRIS', 'Debit', 'Lainnya'];

const categoryColors: Record<Category, string> = {
  Listrik: 'bg-amber-50 text-amber-700 border-amber-200',
  Air: 'bg-sky-50 text-sky-700 border-sky-200',
  'Internet/WiFi': 'bg-blue-50 text-blue-700 border-blue-200',
  Kebersihan: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  'Perawatan & Perbaikan': 'bg-orange-50 text-orange-700 border-orange-200',
  'Gaji Karyawan': 'bg-teal-50 text-teal-700 border-teal-200',
  'Perlengkapan Kos': 'bg-rose-50 text-rose-700 border-rose-200',
  'Biaya Lainnya': 'bg-slate-100 text-slate-700 border-slate-200',
};

const statusConfig: Record<PaymentStatus, { color: string; icon: typeof Check }> = {
  Lunas: { color: 'border-emerald-200 bg-emerald-50 text-emerald-700', icon: Check },
  'Belum Lunas': { color: 'border-rose-200 bg-rose-50 text-rose-700', icon: Clock },
  Sebagian: { color: 'border-amber-200 bg-amber-50 text-amber-700', icon: Clock },
};

const methodConfig: Record<PaymentMethod, string> = {
  Tunai: 'bg-slate-100 text-slate-600',
  'Transfer Bank': 'bg-blue-50 text-blue-600',
  QRIS: 'bg-purple-50 text-purple-600',
  Debit: 'bg-teal-50 text-teal-600',
  Lainnya: 'bg-slate-100 text-slate-500',
};

const propertyPhotos = [
  { url: 'https://images.pexels.com/photos/4493552/pexels-photo-4493552.jpeg?auto=compress&cs=tinysrgb&h=650&w=940', label: 'Fasad', title: 'Bangunan Kos Modern Minimalis' },
  { url: 'https://images.pexels.com/photos/6487950/pexels-photo-6487950.jpeg?auto=compress&cs=tinysrgb&h=650&w=940', label: 'Kamar', title: 'Kamar Single Cozy & Terang' },
  { url: 'https://images.pexels.com/photos/33389378/pexels-photo-33389378.jpeg?auto=compress&cs=tinysrgb&h=650&w=940', label: 'Pantry', title: 'Dapur Komunal Bersih' },
  { url: 'https://images.pexels.com/photos/15143517/pexels-photo-15143517.jpeg?auto=compress&cs=tinysrgb&h=650&w=940', label: 'Parkir', title: 'Area Parkir Aman & Beratap' },
];

const rupiah = (amount: number) =>
  new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(amount);
const dateText = (date: string) =>
  new Intl.DateTimeFormat('id-ID', { day: '2-digit', month: 'short', year: 'numeric' }).format(new Date(`${date}T00:00:00`));

const today = new Date().toISOString().split('T')[0];
const todayCode = today.replace(/-/g, '').substring(2);

function newForm(count: number): FormState {
  return {
    transaction_date: today,
    transaction_number: `BKK-${todayCode}-${String(count + 1).padStart(3, '0')}`,
    description: '',
    category: 'Listrik',
    amount: '',
    status: 'Lunas',
    payment_method: 'Tunai',
  };
}

function App() {
  const [tab, setTab] = useState<Tab>('dashboard');
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [photo, setPhoto] = useState(0);
  const [notice, setNotice] = useState<string | null>(null);
  const [modal, setModal] = useState<'add' | 'edit' | null>(null);
  const [editing, setEditing] = useState<Expense | null>(null);
  const [removeTarget, setRemoveTarget] = useState<Expense | null>(null);
  const [query, setQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<'Semua Kategori' | Category>('Semua Kategori');
  const [statusFilter, setStatusFilter] = useState<'Semua Status' | PaymentStatus>('Semua Status');
  const [form, setForm] = useState<FormState>(newForm(0));
  const [dateFilter, setDateFilter] = useState('semua');
  const [periodMode, setPeriodMode] = useState<'semua' | 'bulan' | 'tahun'>('semua');
  const [profile, setProfile] = useState({ business_name: 'Harmoni Residence Kost Putri', business_address: 'Jl. Cempaka Raya No. 18, Tembalang, Kota Semarang', manager_name: 'Andi Setiawan' });

  const notify = useCallback((message: string) => {
    setNotice(message);
    window.setTimeout(() => setNotice(null), 3200);
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    const result = await supabase.from('cash_expenses').select('*').order('transaction_date', { ascending: false });
    if (result.error) { notify('Data transaksi belum dapat dimuat.'); setLoading(false); return; }
    setExpenses((result.data ?? []) as Expense[]);
    setLoading(false);
  }, [notify]);

  useEffect(() => { void load(); }, [load]);

  useEffect(() => {
    void (async () => {
      const { data } = await supabase.from('property_settings').select('business_name, business_address, manager_name').eq('id', 1).maybeSingle();
      if (data) { setProfile(data); return; }
      await supabase.from('property_settings').insert({ id: 1 });
      const { data: fresh } = await supabase.from('property_settings').select('business_name, business_address, manager_name').eq('id', 1).maybeSingle();
      if (fresh) setProfile(fresh);
    })();
  }, []);

  const total = expenses.reduce((sum, e) => sum + Number(e.amount), 0);
  const totalLunas = expenses.filter((e) => (e.status ?? 'Lunas') === 'Lunas').reduce((sum, e) => sum + Number(e.amount), 0);
  const totalBelumLunas = expenses.filter((e) => (e.status ?? 'Lunas') !== 'Lunas').reduce((sum, e) => sum + Number(e.amount), 0);
  const utilities = expenses.filter((e) => ['Listrik', 'Air', 'Internet/WiFi'].includes(e.category)).reduce((sum, e) => sum + Number(e.amount), 0);
  const unpaidList = expenses.filter((e) => (e.status ?? 'Lunas') !== 'Lunas');
  const ratio = total ? Math.round((totalLunas / total) * 100) : 100;

  const filtered = useMemo(() => expenses.filter((item) => {
    const matchSearch = `${item.transaction_number} ${item.description} ${item.category}`.toLowerCase().includes(query.toLowerCase());
    const matchCategory = categoryFilter === 'Semua Kategori' || item.category === categoryFilter;
    const matchStatus = statusFilter === 'Semua Status' || (item.status ?? 'Lunas') === statusFilter;
    let matchDate = true;
    if (periodMode === 'bulan' && dateFilter !== 'semua') matchDate = item.transaction_date.startsWith(dateFilter);
    else if (periodMode === 'tahun' && dateFilter !== 'semua') matchDate = item.transaction_date.startsWith(dateFilter);
    return matchSearch && matchCategory && matchStatus && matchDate;
  }), [expenses, query, categoryFilter, statusFilter, dateFilter, periodMode]);

  const categoryTotals = categories
    .map((cat) => ({ category: cat, amount: expenses.filter((e) => e.category === cat).reduce((sum, e) => sum + Number(e.amount), 0) }))
    .filter((e) => e.amount > 0)
    .sort((a, b) => b.amount - a.amount);

  const openAdd = () => { setEditing(null); setForm(newForm(expenses.length)); setModal('add'); };
  const openEdit = (item: Expense) => {
    setEditing(item);
    setForm({
      transaction_date: item.transaction_date,
      transaction_number: item.transaction_number,
      description: item.description,
      category: item.category,
      amount: String(item.amount),
      status: item.status ?? 'Lunas',
      payment_method: item.payment_method ?? 'Tunai',
    });
    setModal('edit');
  };

  const save = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const { status, payment_method, ...coreForm } = form;
    const corePayload = { ...coreForm, amount: Number(form.amount) };
    const fullPayload = { ...corePayload, status, payment_method };

    if (!corePayload.description || !corePayload.transaction_number || !corePayload.amount) {
      notify('Lengkapi semua data transaksi terlebih dahulu.'); return;
    }

    // Coba simpan dengan semua kolom (termasuk status & payment_method)
    let result = editing
      ? await supabase.from('cash_expenses').update(fullPayload).eq('id', editing.id).select('*').maybeSingle()
      : await supabase.from('cash_expenses').insert(fullPayload).select('*').maybeSingle();

    // Jika gagal karena kolom belum ada, fallback ke kolom dasar saja
    if (result.error) {
      console.warn('Kolom status/payment_method mungkin belum ada, fallback ke core payload:', result.error.message);
      result = editing
        ? await supabase.from('cash_expenses').update(corePayload).eq('id', editing.id).select('*').maybeSingle()
        : await supabase.from('cash_expenses').insert(corePayload).select('*').maybeSingle();
    }

    if (result.error || !result.data) {
      notify('Transaksi belum dapat disimpan: ' + (result.error?.message ?? 'data kosong'));
      return;
    }
    setExpenses((items) =>
      editing ? items.map((i) => (i.id === editing.id ? (result.data as Expense) : i)) : [result.data as Expense, ...items]
    );
    setModal(null);
    notify(editing ? 'Transaksi berhasil diperbarui.' : 'Transaksi berhasil ditambahkan.');
  };

  const remove = async () => {
    if (!removeTarget) return;
    const result = await supabase.from('cash_expenses').delete().eq('id', removeTarget.id);
    if (result.error) { notify('Transaksi belum dapat dihapus.'); return; }
    setExpenses((items) => items.filter((i) => i.id !== removeTarget.id));
    setRemoveTarget(null);
    notify('Transaksi berhasil dihapus.');
  };

  const exportCsv = () => {
    const csv = [
      ['Tanggal', 'Nomor Transaksi', 'Keterangan', 'Kategori', 'Nominal', 'Status', 'Metode Bayar'],
      ...filtered.map((e) => [e.transaction_date, e.transaction_number, e.description, e.category, String(e.amount), e.status ?? 'Lunas', e.payment_method ?? 'Tunai']),
    ].map((row) => row.map((v) => `"${v.replace(/"/g, '""')}"`).join(',')).join('\n');
    const link = document.createElement('a');
    link.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
    link.download = 'laporan-kas-keluar.csv';
    link.click();
    notify('Laporan berhasil diekspor.');
  };

  const saveProfile = async (next: typeof profile) => {
    const result = await supabase.from('property_settings').update({ ...next, updated_at: new Date().toISOString() }).eq('id', 1);
    if (result.error) { notify('Profil usaha belum dapat disimpan.'); return; }
    setProfile(next);
    notify('Profil usaha berhasil disimpan.');
  };

  const tabs: { id: Tab; label: string; icon: typeof LayoutDashboard }[] = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'transaksi', label: 'Buku Transaksi', icon: Receipt },
    { id: 'laporan', label: 'Laporan Akuntansi', icon: FileBarChart },
    { id: 'kategori', label: 'Master Kategori', icon: Tags },
    { id: 'pengaturan', label: 'Pengaturan', icon: Settings2 },
  ];

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 selection:bg-emerald-100 selection:text-emerald-900">
      {/* Header */}
      <header className="sticky top-0 z-30 border-b border-slate-200/90 bg-white/95 shadow-sm backdrop-blur">
        <div className="mx-auto flex h-[72px] max-w-[1440px] items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-600 to-emerald-900 text-white shadow-lg shadow-emerald-600/20"><Hotel size={20} /></div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="truncate text-base font-extrabold tracking-tight text-slate-900 sm:text-lg">Harmoni Residence</span>
                <span className="hidden rounded-full border border-rose-200 bg-rose-50 px-2 py-0.5 text-[10px] font-bold text-rose-700 sm:inline">Kost Putri</span>
              </div>
              <p className="hidden text-[11px] font-medium text-slate-500 sm:block">Sistem Informasi Akuntansi Kas Keluar</p>
            </div>
          </div>
          <nav className="hidden items-center gap-1 lg:flex">
            {tabs.map(({ id, label, icon: Icon }) => (
              <button key={id} onClick={() => setTab(id)} className={`flex items-center gap-2 rounded-xl px-3.5 py-2.5 text-xs transition ${tab === id ? 'border border-emerald-200 bg-emerald-50 font-bold text-emerald-700' : 'font-medium text-slate-500 hover:bg-slate-100 hover:text-slate-800'}`}>
                <Icon size={15} />{label}
              </button>
            ))}
          </nav>
          <button onClick={openAdd} className="flex shrink-0 items-center gap-2 rounded-xl bg-emerald-600 px-3.5 py-2.5 text-xs font-bold text-white shadow-md shadow-emerald-600/20 transition hover:bg-emerald-700">
            <Plus size={16} /><span className="hidden sm:inline">Catat Pengeluaran</span>
          </button>
        </div>
        <nav className="flex overflow-x-auto border-t border-slate-100 px-2 py-1.5 lg:hidden">
          {tabs.map(({ id, label, icon: Icon }) => (
            <button key={id} onClick={() => setTab(id)} className={`flex min-w-fit flex-1 flex-col items-center gap-1 rounded-lg px-3 py-1.5 text-[10px] ${tab === id ? 'font-bold text-emerald-700' : 'text-slate-500'}`}>
              <Icon size={16} />{label.replace('Laporan Akuntansi', 'Laporan').replace('Buku Transaksi', 'Transaksi').replace('Master Kategori', 'Kategori')}
            </button>
          ))}
        </nav>
      </header>

      <main className="mx-auto max-w-[1440px] space-y-6 px-4 py-6 sm:px-6 lg:px-8">
        {tab === 'dashboard' && <Dashboard expenses={expenses} total={total} totalLunas={totalLunas} totalBelumLunas={totalBelumLunas} utilities={utilities} unpaidList={unpaidList} ratio={ratio} categoryTotals={categoryTotals} loading={loading} photo={photo} setPhoto={setPhoto} openAdd={openAdd} setTab={setTab} openEdit={openEdit} setRemoveTarget={setRemoveTarget} />}
        {tab === 'transaksi' && <Transactions expenses={filtered} allExpenses={expenses} query={query} setQuery={setQuery} categoryFilter={categoryFilter} setCategoryFilter={setCategoryFilter} statusFilter={statusFilter} setStatusFilter={setStatusFilter} dateFilter={dateFilter} setDateFilter={setDateFilter} periodMode={periodMode} setPeriodMode={setPeriodMode} openAdd={openAdd} openEdit={openEdit} setRemoveTarget={setRemoveTarget} exportCsv={exportCsv} loading={loading} />}
        {tab === 'laporan' && <Reports expenses={expenses} categoryTotals={categoryTotals} exportCsv={exportCsv} />}
        {tab === 'kategori' && <Categories categoryTotals={categoryTotals} />}
        {tab === 'pengaturan' && <SettingsPage profile={profile} onSave={saveProfile} />}
      </main>

      {notice && (
        <div className="fixed bottom-5 right-5 z-50 flex items-center gap-3 rounded-xl bg-slate-900 px-4 py-3 text-xs font-semibold text-white shadow-xl">
          <CheckCircle2 size={17} className="text-emerald-400" />{notice}
        </div>
      )}
      {modal && <ExpenseModal mode={modal} form={form} setForm={setForm} onClose={() => setModal(null)} onSubmit={save} />}
      {removeTarget && <ConfirmDelete item={removeTarget} onClose={() => setRemoveTarget(null)} onConfirm={() => void remove()} />}
    </div>
  );
}

/* ─────────────── DASHBOARD ─────────────── */
function Dashboard({ expenses, total, totalLunas, totalBelumLunas, utilities, unpaidList, ratio, categoryTotals, loading, photo, setPhoto, openAdd, setTab, openEdit, setRemoveTarget }: {
  expenses: Expense[]; total: number; totalLunas: number; totalBelumLunas: number; utilities: number;
  unpaidList: Expense[]; ratio: number; categoryTotals: { category: Category; amount: number }[];
  loading: boolean; photo: number; setPhoto: (v: number) => void; openAdd: () => void;
  setTab: (t: Tab) => void; openEdit: (e: Expense) => void; setRemoveTarget: (e: Expense) => void;
}) {
  return (
    <>
      {/* Hero */}
      <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
        <div className="grid lg:grid-cols-12">
          <div className="flex flex-col justify-between space-y-6 bg-gradient-to-br from-white via-slate-50 to-emerald-50/60 p-6 sm:p-8 lg:col-span-7">
            <div>
              <div className="mb-3 flex flex-wrap gap-2">
                <span className="rounded-full border border-rose-200 bg-rose-50 px-3 py-1 text-[11px] font-bold text-rose-700">Kost Putri Eksklusif & Asri</span>
                <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-[11px] font-semibold text-emerald-700">
                  <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-500" /> Okupansi: 21 / 24 Kamar
                </span>
              </div>
              <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 sm:text-3xl">Harmoni Residence Kost Putri</h1>
              <p className="mt-2 flex items-center gap-1.5 text-xs font-medium text-slate-500 sm:text-sm"><MapPin size={14} className="text-rose-600" /> Jl. Cempaka Raya No. 18, Tembalang, Kota Semarang</p>
              <p className="mt-3 max-w-2xl text-xs leading-6 text-slate-600 sm:text-sm">Sistem Informasi Akuntansi Kas Keluar Terpadu untuk memantau pengeluaran operasional dan menjaga kesehatan keuangan properti secara transparan.</p>
            </div>
            <div className="grid grid-cols-2 gap-2 border-t border-slate-100 pt-4 sm:grid-cols-4">
              <Amenity icon={Wifi} label="Wi-Fi 100Mbps" tone="green" />
              <Amenity icon={Building2} label="AC & Heater" tone="blue" />
              <Amenity icon={ShieldCheck} label="CCTV 24 Jam" tone="rose" />
              <Amenity icon={Settings2} label="Smart Lock" tone="amber" />
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <button onClick={openAdd} className="flex items-center gap-1.5 rounded-xl bg-emerald-600 px-3.5 py-2.5 text-xs font-bold text-white shadow-md shadow-emerald-600/20"><Plus size={15} /> Catat Pengeluaran</button>
              <button onClick={() => setTab('laporan')} className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-xs font-bold text-slate-700"><FileText size={15} className="text-emerald-600" /> Buka Laporan</button>
            </div>
          </div>
          <div className="border-t border-slate-200 bg-slate-50/70 p-4 sm:p-5 lg:col-span-5 lg:border-l lg:border-t-0">
            <div className="group relative h-56 overflow-hidden rounded-2xl border border-slate-200 bg-slate-200 shadow-sm">
              <img src={propertyPhotos[photo].url} alt={propertyPhotos[photo].title} className="h-full w-full object-cover transition duration-500 group-hover:scale-105" />
              <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-slate-900/10 to-transparent" />
              <div className="absolute bottom-3 left-3 right-3 text-white">
                <span className="mb-1 inline-flex rounded-md bg-white/95 px-2 py-1 text-[10px] font-bold text-slate-800">{propertyPhotos[photo].label}</span>
                <p className="text-xs font-semibold">{propertyPhotos[photo].title}</p>
              </div>
            </div>
            <div className="mt-3 grid grid-cols-4 gap-2">
              {propertyPhotos.map((item, index) => (
                <button key={item.label} onClick={() => setPhoto(index)} className={`relative h-12 overflow-hidden rounded-xl border-2 transition ${photo === index ? 'border-emerald-500' : 'border-transparent hover:border-slate-300'}`}>
                  <img src={item.url} alt={item.label} className="h-full w-full object-cover" />
                  <span className="absolute inset-x-0 bottom-0 bg-slate-950/70 py-0.5 text-[9px] font-semibold text-white">{item.label}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Metric Cards */}
      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <Metric title="Kas Terealisasi" value={rupiah(totalLunas)} icon={Wallet} tone="green" note={`${expenses.filter(e => e.status === 'Lunas').length} Trx lunas`} />
        <Metric title="Belum Dilunasi" value={rupiah(totalBelumLunas)} icon={CircleDollarSign} tone="rose" note={`${unpaidList.length} Trx pending`} />
        <Metric title="Utilitas & WiFi" value={rupiah(utilities)} icon={Zap} tone="amber" note="Listrik / Air / Net" />
        <Metric title="Total Beban" value={rupiah(total)} icon={BarChart3} tone="blue" note={`${expenses.length} Trx tercatat`} />
        <Metric title="Rasio Pelunasan" value={`${ratio}%`} icon={CheckCircle2} tone="green" note="Realisasi kas" />
      </section>

      <MonthlyChart expenses={expenses} />

      {/* Distribusi & Tagihan Belum Lunas */}
      <section className="grid gap-6 lg:grid-cols-12">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm lg:col-span-5">
          <div className="mb-5 flex items-start justify-between">
            <div><h2 className="text-sm font-bold text-slate-900">Distribusi Kategori Beban</h2><p className="mt-1 text-xs text-slate-500">Komposisi pos pengeluaran kos</p></div>
            <button onClick={() => setTab('laporan')} className="text-xs font-bold text-emerald-700">Lihat Detail</button>
          </div>
          <div className="space-y-4">
            {categoryTotals.slice(0, 5).map(({ category, amount }) => (
              <div key={category}>
                <div className="mb-1.5 flex justify-between text-xs"><span className="font-medium text-slate-600">{category}</span><b className="text-slate-800">{rupiah(amount)}</b></div>
                <div className="h-2 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-emerald-500" style={{ width: `${Math.max((amount / (total || 1)) * 100, 5)}%` }} /></div>
              </div>
            ))}
          </div>
          {!categoryTotals.length && <p className="py-10 text-center text-xs text-slate-400">Belum ada data pengeluaran.</p>}
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm lg:col-span-7">
          <div className="mb-4 flex items-start justify-between">
            <div>
              <h2 className="flex items-center gap-2 text-sm font-bold text-slate-900"><span className="h-2.5 w-2.5 animate-pulse rounded-full bg-rose-500" /> Tagihan Belum Lunas</h2>
              <p className="mt-1 text-xs text-slate-500">Biaya operasional yang perlu segera diselesaikan.</p>
            </div>
            <span className="rounded-lg border border-rose-200 bg-rose-50 px-2.5 py-1 text-[10px] font-bold text-rose-700">{unpaidList.length} Tagihan</span>
          </div>
          <TransactionTable expenses={unpaidList.slice(0, 5)} loading={loading} openEdit={openEdit} setRemoveTarget={setRemoveTarget} compact />
        </div>
      </section>

      {/* Riwayat Terkini */}
      <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-slate-100 p-5">
          <div><h2 className="text-sm font-bold text-slate-900">Riwayat 5 Kas Keluar Terkini</h2><p className="mt-1 text-xs text-slate-500">Aktivitas arus kas terbaru di Harmoni Residence</p></div>
          <button onClick={() => setTab('transaksi')} className="text-xs font-bold text-emerald-700">Buku Transaksi Lengkap →</button>
        </div>
        <TransactionTable expenses={expenses.slice(0, 5)} loading={loading} openEdit={openEdit} setRemoveTarget={setRemoveTarget} compact />
      </section>
    </>
  );
}

/* ─────────────── MONTHLY CHART ─────────────── */
function MonthlyChart({ expenses }: { expenses: Expense[] }) {
  const monthNames: Record<string, string> = { '01': 'Jan', '02': 'Feb', '03': 'Mar', '04': 'Apr', '05': 'Mei', '06': 'Jun', '07': 'Jul', '08': 'Agt', '09': 'Sep', '10': 'Okt', '11': 'Nov', '12': 'Des' };
  // Ambil 6 bulan terakhir dari data
  const monthMap: Record<string, number> = {};
  expenses.forEach((e) => {
    const key = e.transaction_date.substring(0, 7);
    monthMap[key] = (monthMap[key] ?? 0) + Number(e.amount);
  });
  const sorted = Object.keys(monthMap).sort().slice(-6);
  const bars = sorted.map((ym) => {
    const [, m] = ym.split('-');
    return { label: monthNames[m] ?? m, amount: monthMap[ym], key: ym };
  });
  const max = Math.max(...bars.map((b) => b.amount), 1);
  const currentMonth = new Date().toISOString().substring(0, 7);

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between">
        <div><h2 className="text-sm font-bold text-slate-900">Grafik Pengeluaran Bulanan</h2><p className="mt-1 text-xs text-slate-500">Perbandingan kas keluar 6 bulan terakhir.</p></div>
        <span className="rounded-lg bg-emerald-50 px-2.5 py-1 text-[10px] font-bold text-emerald-700">{new Date().getFullYear()}</span>
      </div>
      <div className="mt-6 flex h-44 items-end gap-3 border-b border-l border-slate-100 px-3 sm:gap-6 sm:px-8">
        {bars.length === 0
          ? <p className="w-full py-10 text-center text-xs text-slate-400">Belum ada data.</p>
          : bars.map((item) => (
            <div key={item.key} className="flex h-full flex-1 flex-col items-center justify-end gap-2">
              <span className="text-[9px] font-bold text-slate-500">{rupiah(item.amount).replace('Rp\u00a0', 'Rp').replace('.000', 'rb')}</span>
              <div className={`w-full max-w-10 rounded-t-lg transition hover:opacity-80 ${item.key === currentMonth ? 'bg-emerald-600' : 'bg-emerald-300'}`} style={{ height: `${Math.max((item.amount / max) * 75, 6)}%` }} />
              <span className={`text-[10px] ${item.key === currentMonth ? 'font-bold text-emerald-700' : 'text-slate-500'}`}>{item.label}</span>
            </div>
          ))
        }
      </div>
    </section>
  );
}

/* ─────────────── TRANSAKSI ─────────────── */
function Transactions({ expenses, allExpenses, query, setQuery, categoryFilter, setCategoryFilter, statusFilter, setStatusFilter, dateFilter, setDateFilter, periodMode, setPeriodMode, openAdd, openEdit, setRemoveTarget, exportCsv, loading }: {
  expenses: Expense[]; allExpenses: Expense[]; query: string; setQuery: (v: string) => void;
  categoryFilter: 'Semua Kategori' | Category; setCategoryFilter: (v: 'Semua Kategori' | Category) => void;
  statusFilter: 'Semua Status' | PaymentStatus; setStatusFilter: (v: 'Semua Status' | PaymentStatus) => void;
  dateFilter: string; setDateFilter: (v: string) => void;
  periodMode: 'semua' | 'bulan' | 'tahun'; setPeriodMode: (v: 'semua' | 'bulan' | 'tahun') => void;
  openAdd: () => void; openEdit: (e: Expense) => void; setRemoveTarget: (e: Expense) => void;
  exportCsv: () => void; loading: boolean;
}) {
  const uniqueYears = [...new Set(allExpenses.map((e) => e.transaction_date.substring(0, 4)))].sort((a, b) => b.localeCompare(a));
  const uniqueMonths = [...new Set(allExpenses.map((e) => e.transaction_date.substring(0, 7)))].sort((a, b) => b.localeCompare(a));
  const monthNames: Record<string, string> = { '01': 'Januari', '02': 'Februari', '03': 'Maret', '04': 'April', '05': 'Mei', '06': 'Juni', '07': 'Juli', '08': 'Agustus', '09': 'September', '10': 'Oktober', '11': 'November', '12': 'Desember' };

  const handleModeChange = (mode: 'semua' | 'bulan' | 'tahun') => { setPeriodMode(mode); setDateFilter('semua'); };

  return (
    <>
      <PageTitle eyebrow="Pencatatan kas" title="Buku Pengeluaran Kas" description="Daftar menyeluruh transaksi pembiayaan dan operasional Harmoni Residence."
        action={<button onClick={openAdd} className="flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-3 text-xs font-bold text-white"><Plus size={16} /> Catat Transaksi</button>} />
      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
        {/* Filter Bar */}
        <div className="flex flex-wrap gap-3 border-b border-slate-100 p-4">
          <label className="relative min-w-[200px] flex-1">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Cari keterangan, nomor, kategori..." className="form-input pl-9" />
          </label>
          <select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value as 'Semua Kategori' | Category)} className="form-input w-auto">
            <option>Semua Kategori</option>
            {categories.map((c) => <option key={c}>{c}</option>)}
          </select>
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as 'Semua Status' | PaymentStatus)} className="form-input w-auto">
            <option>Semua Status</option>
            <option>Lunas</option>
            <option>Belum Lunas</option>
            <option>Sebagian</option>
          </select>
          <div className="flex overflow-hidden rounded-xl border border-slate-200">
            {(['semua', 'bulan', 'tahun'] as const).map((mode) => (
              <button key={mode} onClick={() => handleModeChange(mode)} className={`px-3 py-2.5 text-xs font-bold transition ${periodMode === mode ? 'bg-emerald-600 text-white' : 'bg-white text-slate-500 hover:bg-slate-50'}`}>
                {mode === 'semua' ? 'Semua' : mode === 'bulan' ? 'Per Bulan' : 'Per Tahun'}
              </button>
            ))}
          </div>
          {periodMode !== 'semua' && (
            <select value={dateFilter} onChange={(e) => setDateFilter(e.target.value)} className="form-input w-auto">
              <option value="semua">{periodMode === 'bulan' ? 'Pilih Bulan' : 'Pilih Tahun'}</option>
              {periodMode === 'bulan'
                ? uniqueMonths.map((ym) => { const [y, m] = ym.split('-'); return <option key={ym} value={ym}>{monthNames[m]} {y}</option>; })
                : uniqueYears.map((y) => <option key={y} value={y}>Tahun {y}</option>)
              }
            </select>
          )}
          <button onClick={exportCsv} className="flex items-center gap-2 rounded-xl border border-slate-200 px-4 text-xs font-bold text-slate-600 hover:bg-slate-50">
            <Download size={15} /> Unduh CSV
          </button>
        </div>

        {/* Info bar */}
        {(query || categoryFilter !== 'Semua Kategori' || statusFilter !== 'Semua Status' || (periodMode !== 'semua' && dateFilter !== 'semua')) && (
          <div className="flex items-center justify-between border-b border-slate-100 bg-emerald-50 px-4 py-2">
            <span className="text-xs font-medium text-emerald-700">Menampilkan <b>{expenses.length}</b> transaksi</span>
            <button onClick={() => { setQuery(''); setCategoryFilter('Semua Kategori'); setStatusFilter('Semua Status'); handleModeChange('semua'); }} className="text-xs font-bold text-emerald-700 hover:underline">Reset Semua Filter</button>
          </div>
        )}

        <TransactionTable expenses={expenses} loading={loading} openEdit={openEdit} setRemoveTarget={setRemoveTarget} />
      </div>
    </>
  );
}

/* ─────────────── LAPORAN ─────────────── */
function Reports({ expenses, categoryTotals, exportCsv }: { expenses: Expense[]; categoryTotals: { category: Category; amount: number }[]; exportCsv: () => void }) {
  const total = expenses.reduce((sum, e) => sum + Number(e.amount), 0);
  const totalLunas = expenses.filter((e) => (e.status ?? 'Lunas') === 'Lunas').reduce((sum, e) => sum + Number(e.amount), 0);
  const totalBelum = expenses.filter((e) => (e.status ?? 'Lunas') !== 'Lunas').reduce((sum, e) => sum + Number(e.amount), 0);
  return (
    <>
      <PageTitle eyebrow="Standard accounting suite" title="Laporan Akuntansi Kas Keluar" description="Rekapitulasi beban operasional dan evaluasi arus kas Harmoni Residence."
        action={<div className="flex gap-2"><button onClick={() => window.print()} className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 text-xs font-bold text-slate-600"><Printer size={15} /> Cetak</button><button onClick={exportCsv} className="flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-3 text-xs font-bold text-white"><Download size={15} /> Ekspor</button></div>} />
      <div className="grid gap-4 sm:grid-cols-3">
        <Metric title="Total Beban" value={rupiah(total)} icon={CircleDollarSign} tone="blue" note="Seluruh periode" />
        <Metric title="Kas Terealisasi" value={rupiah(totalLunas)} icon={CheckCircle2} tone="green" note="Sudah dilunasi" />
        <Metric title="Belum Dilunasi" value={rupiah(totalBelum)} icon={Clock} tone="rose" note={`${expenses.filter(e => e.status !== 'Lunas').length} transaksi`} />
      </div>
      <div className="grid gap-6 lg:grid-cols-5">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm lg:col-span-3">
          <h2 className="text-sm font-bold text-slate-900">Rekapitulasi Beban per Kategori</h2>
          <p className="mt-1 text-xs text-slate-500">Komposisi biaya operasional usaha kos.</p>
          <div className="mt-5 overflow-x-auto">
            <table className="w-full min-w-[460px] text-left text-xs">
              <thead className="border-b border-slate-100 text-[10px] uppercase tracking-wider text-slate-400">
                <tr><th className="py-3">Kategori</th><th className="py-3 text-center">Trx</th><th className="py-3 text-right">Total Beban</th><th className="py-3 text-right">Porsi</th></tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {categoryTotals.map(({ category, amount }) => (
                  <tr key={category}>
                    <td className="py-3 font-semibold text-slate-700">{category}</td>
                    <td className="py-3 text-center text-slate-500">{expenses.filter((e) => e.category === category).length}</td>
                    <td className="py-3 text-right font-bold text-slate-800">{rupiah(amount)}</td>
                    <td className="py-3 text-right font-bold text-emerald-700">{total ? `${((amount / total) * 100).toFixed(1)}%` : '0%'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm lg:col-span-2">
          <h2 className="text-sm font-bold text-slate-900">Ringkasan Status Pembayaran</h2>
          <div className="mt-5 space-y-3">
            {(['Lunas', 'Belum Lunas', 'Sebagian'] as PaymentStatus[]).map((s) => {
              const count = expenses.filter((e) => (e.status ?? 'Lunas') === s).length;
              const amt = expenses.filter((e) => (e.status ?? 'Lunas') === s).reduce((sum, e) => sum + Number(e.amount), 0);
              return (
                <div key={s} className="flex items-center justify-between rounded-xl border border-slate-100 bg-slate-50 p-3">
                  <div className="flex items-center gap-2">
                    <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-bold ${statusConfig[s].color}`}>{s}</span>
                    <span className="text-xs text-slate-500">{count} transaksi</span>
                  </div>
                  <b className="text-xs text-slate-800">{rupiah(amt)}</b>
                </div>
              );
            })}
          </div>
          <div className="mt-5 space-y-3 text-xs text-slate-600">
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-3"><b className="text-slate-800">Verifikasi rutin</b><p className="mt-1 leading-5 text-slate-500">Cocokkan buku kas dengan bukti pembayaran setiap akhir periode.</p></div>
          </div>
        </div>
      </div>
    </>
  );
}

/* ─────────────── KATEGORI ─────────────── */
function Categories({ categoryTotals }: { categoryTotals: { category: Category; amount: number }[] }) {
  return (
    <>
      <PageTitle eyebrow="Master data" title="Kategori Biaya Operasional" description="Daftar pos pengeluaran yang digunakan dalam pencatatan kas keluar." />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {categories.map((category) => (
          <div key={category} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className={`mb-5 flex h-10 w-10 items-center justify-center rounded-xl border ${categoryColors[category]}`}><Tags size={18} /></div>
            <h2 className="text-sm font-bold text-slate-800">{category}</h2>
            <p className="mt-2 text-xs text-slate-500">{categoryTotals.find((e) => e.category === category)?.amount ? rupiah(categoryTotals.find((e) => e.category === category)?.amount ?? 0) : 'Belum ada transaksi'}</p>
          </div>
        ))}
      </div>
    </>
  );
}

/* ─────────────── PENGATURAN ─────────────── */
function SettingsPage({ profile, onSave }: { profile: { business_name: string; business_address: string; manager_name: string }; onSave: (p: typeof profile) => Promise<void> }) {
  const [draft, setDraft] = useState(profile);
  useEffect(() => setDraft(profile), [profile]);
  return (
    <>
      <PageTitle eyebrow="Preferensi aplikasi" title="Pengaturan" description="Kelola profil usaha kos dan informasi akun administrator." />
      <div className="grid max-w-5xl gap-6 lg:grid-cols-[220px_1fr]">
        <div className="rounded-2xl border border-slate-200 bg-white p-2 shadow-sm">
          <div className="flex items-center gap-3 rounded-xl bg-emerald-50 px-4 py-3 text-xs font-bold text-emerald-700"><Settings2 size={16} /> Profil usaha</div>
          <div className="mt-1 flex items-center gap-3 rounded-xl px-4 py-3 text-xs font-medium text-slate-500"><Users size={16} /> Akun pengguna</div>
        </div>
        <form onSubmit={(e) => { e.preventDefault(); void onSave(draft); }} className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="border-b border-slate-100 pb-5"><h2 className="text-sm font-bold text-slate-900">Informasi usaha kos</h2><p className="mt-1 text-xs text-slate-500">Informasi ini akan tampil di area properti dan laporan.</p></div>
          <div className="mt-6 space-y-5">
            <label><span className="form-label">Nama usaha</span><input value={draft.business_name} onChange={(e) => setDraft({ ...draft, business_name: e.target.value })} className="form-input" required /></label>
            <label><span className="form-label">Alamat usaha</span><textarea value={draft.business_address} onChange={(e) => setDraft({ ...draft, business_address: e.target.value })} rows={3} className="form-input resize-none" required /></label>
            <label><span className="form-label">Nama administrator</span><input value={draft.manager_name} onChange={(e) => setDraft({ ...draft, manager_name: e.target.value })} className="form-input" required /></label>
            <div className="flex justify-end border-t border-slate-100 pt-5"><button type="submit" className="rounded-xl bg-emerald-600 px-5 py-3 text-xs font-bold text-white">Simpan Perubahan</button></div>
          </div>
        </form>
      </div>
    </>
  );
}

/* ─────────────── SHARED COMPONENTS ─────────────── */
function Amenity({ icon: Icon, label, tone }: { icon: typeof Wifi; label: string; tone: 'green' | 'blue' | 'rose' | 'amber' }) {
  const styles = { green: 'bg-emerald-100 text-emerald-700', blue: 'bg-sky-100 text-sky-700', rose: 'bg-rose-100 text-rose-700', amber: 'bg-amber-100 text-amber-700' };
  return <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white p-2 shadow-sm"><div className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-xs ${styles[tone]}`}><Icon size={13} /></div><span className="text-[10px] font-semibold leading-tight text-slate-700">{label}</span></div>;
}

function Metric({ title, value, icon: Icon, tone, note }: { title: string; value: string; icon: typeof Wallet; tone: 'green' | 'rose' | 'amber' | 'blue'; note: string }) {
  const styles = { green: 'bg-emerald-50 text-emerald-700 border-emerald-200', rose: 'bg-rose-50 text-rose-700 border-rose-200', amber: 'bg-amber-50 text-amber-700 border-amber-200', blue: 'bg-sky-50 text-sky-700 border-sky-200' };
  return (
    <div className="flex min-h-[132px] flex-col justify-between rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-2"><span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">{title}</span><span className={`rounded-lg border p-2 ${styles[tone]}`}><Icon size={15} /></span></div>
      <div><p className="text-lg font-extrabold tracking-tight text-slate-900">{value}</p><p className="mt-1 text-[10px] font-medium text-slate-400">{note}</p></div>
    </div>
  );
}

function PageTitle({ eyebrow, title, description, action }: { eyebrow: string; title: string; description: string; action?: React.ReactNode }) {
  return (
    <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
      <div><p className="mb-2 text-[10px] font-bold uppercase tracking-[0.2em] text-emerald-700">{eyebrow}</p><h1 className="text-2xl font-extrabold tracking-tight text-slate-900 sm:text-3xl">{title}</h1><p className="mt-2 text-sm text-slate-500">{description}</p></div>
      {action}
    </div>
  );
}

function StatusBadge({ status }: { status?: PaymentStatus }) {
  const s: PaymentStatus = status ?? 'Lunas';
  const cfg = statusConfig[s];
  const Icon = cfg.icon;
  return <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-1 text-[10px] font-bold ${cfg.color}`}><Icon size={11} />{s}</span>;
}

function TransactionTable({ expenses, loading, openEdit, setRemoveTarget, compact = false }: {
  expenses: Expense[]; loading: boolean; openEdit: (e: Expense) => void; setRemoveTarget: (e: Expense) => void; compact?: boolean;
}) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[800px] text-left text-xs">
        <thead className="border-b border-slate-100 bg-slate-50/80 text-[10px] font-bold uppercase tracking-wider text-slate-500">
          <tr>
            <th className="px-4 py-3">No. Bukti / Tgl</th>
            <th className="px-4 py-3">Kategori & Uraian</th>
            <th className="px-4 py-3">Nominal</th>
            <th className="px-4 py-3">Metode</th>
            <th className="px-4 py-3 text-center">Status</th>
            <th className="px-4 py-3 text-center">Aksi</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {loading
            ? <tr><td colSpan={6} className="px-4 py-10 text-center text-slate-400">Memuat transaksi...</td></tr>
            : expenses.length === 0
              ? <tr><td colSpan={6} className="px-4 py-10 text-center text-slate-400">Belum ada transaksi.</td></tr>
              : expenses.map((item) => (
                <tr key={item.id} className="transition hover:bg-slate-50">
                  <td className="whitespace-nowrap px-4 py-3">
                    <b className="font-mono text-slate-800">{item.transaction_number}</b>
                    <span className="mt-1 block text-[10px] text-slate-400">{dateText(item.transaction_date)}</span>
                  </td>
                  <td className="px-4 py-3">
                    <b className="block text-slate-800">{item.description}</b>
                    <span className={`mt-1 inline-block rounded border px-1.5 py-0.5 text-[10px] font-semibold ${categoryColors[item.category]}`}>{item.category}</span>
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 font-extrabold text-slate-900">{rupiah(Number(item.amount))}</td>
                  <td className="whitespace-nowrap px-4 py-3">
                    <span className={`inline-flex items-center gap-1 rounded-lg px-2 py-1 text-[10px] font-semibold ${methodConfig[item.payment_method ?? 'Tunai']}`}>
                      <CreditCard size={10} />{item.payment_method ?? 'Tunai'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <StatusBadge status={item.status ?? 'Lunas'} />
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex justify-center gap-1">
                      <button onClick={() => openEdit(item)} className="rounded-lg p-2 text-slate-400 hover:bg-blue-50 hover:text-blue-600" title="Edit"><Edit3 size={14} /></button>
                      <button onClick={() => setRemoveTarget(item)} className="rounded-lg p-2 text-slate-400 hover:bg-rose-50 hover:text-rose-600" title="Hapus"><Trash2 size={14} /></button>
                      {compact && <button className="rounded-lg p-2 text-slate-400 hover:bg-slate-100"><ChevronDown size={14} /></button>}
                    </div>
                  </td>
                </tr>
              ))
          }
        </tbody>
      </table>
    </div>
  );
}

/* ─────────────── MODAL FORM ─────────────── */
function ExpenseModal({ mode, form, setForm, onClose, onSubmit }: {
  mode: 'add' | 'edit'; form: FormState; setForm: (v: FormState) => void; onClose: () => void; onSubmit: (e: FormEvent<HTMLFormElement>) => void;
}) {
  const update = (key: keyof FormState, value: string) => setForm({ ...form, [key]: value });
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4">
      <div className="w-full max-w-xl rounded-3xl bg-white shadow-2xl">
        <div className="flex items-center justify-between rounded-t-3xl bg-emerald-700 px-6 py-5 text-white">
          <div>
            <h2 className="font-bold">{mode === 'add' ? 'Catat Pengeluaran Kas Baru' : 'Edit Transaksi Pengeluaran'}</h2>
            <p className="mt-1 text-xs text-emerald-100">Lengkapi informasi biaya operasional.</p>
          </div>
          <button onClick={onClose}><X size={19} /></button>
        </div>
        <form onSubmit={onSubmit} className="space-y-4 p-6">
          {/* Baris 1: No BKK + Tanggal */}
          <div className="grid gap-4 sm:grid-cols-2">
            <label><span className="form-label">Nomor BKK</span><input value={form.transaction_number} onChange={(e) => update('transaction_number', e.target.value)} className="form-input" required /></label>
            <label><span className="form-label">Tanggal Transaksi</span><input type="date" value={form.transaction_date} onChange={(e) => update('transaction_date', e.target.value)} className="form-input" required /></label>
          </div>

          {/* Uraian */}
          <label><span className="form-label">Uraian / Deskripsi</span><textarea rows={2} value={form.description} onChange={(e) => update('description', e.target.value)} className="form-input resize-none" required /></label>

          {/* Baris 2: Kategori + Nominal */}
          <div className="grid gap-4 sm:grid-cols-2">
            <label>
              <span className="form-label">Kategori Biaya</span>
              <select value={form.category} onChange={(e) => update('category', e.target.value)} className="form-input">
                {categories.map((c) => <option key={c}>{c}</option>)}
              </select>
            </label>
            <label><span className="form-label">Nominal (Rp)</span><input type="number" min="1" value={form.amount} onChange={(e) => update('amount', e.target.value)} className="form-input" required /></label>
          </div>

          {/* Baris 3: Status + Metode Pembayaran */}
          <div className="grid gap-4 sm:grid-cols-2">
            <label>
              <span className="form-label">Status Pembayaran</span>
              <select value={form.status} onChange={(e) => update('status', e.target.value)} className="form-input">
                <option value="Lunas">✅ Lunas</option>
                <option value="Belum Lunas">🔴 Belum Lunas</option>
                <option value="Sebagian">🟡 Sebagian</option>
              </select>
            </label>
            <label>
              <span className="form-label">Metode Pembayaran</span>
              <select value={form.payment_method} onChange={(e) => update('payment_method', e.target.value)} className="form-input">
                {paymentMethods.map((m) => <option key={m}>{m}</option>)}
              </select>
            </label>
          </div>

          {/* Badge preview */}
          <div className="flex items-center gap-2 rounded-xl border border-slate-100 bg-slate-50 px-4 py-3">
            <span className="text-xs text-slate-500">Preview:</span>
            <StatusBadge status={form.status} />
            <span className={`inline-flex items-center gap-1 rounded-lg px-2 py-1 text-[10px] font-semibold ${methodConfig[form.payment_method]}`}>
              <CreditCard size={10} />{form.payment_method}
            </span>
          </div>

          <div className="flex justify-end gap-2 border-t border-slate-100 pt-4">
            <button type="button" onClick={onClose} className="rounded-xl border border-slate-200 px-4 py-2.5 text-xs font-bold text-slate-600">Batal</button>
            <button type="submit" className="rounded-xl bg-emerald-600 px-4 py-2.5 text-xs font-bold text-white">{mode === 'add' ? 'Simpan Transaksi' : 'Simpan Perubahan'}</button>
          </div>
        </form>
      </div>
    </div>
  );
}

/* ─────────────── CONFIRM DELETE ─────────────── */
function ConfirmDelete({ item, onClose, onConfirm }: { item: Expense; onClose: () => void; onConfirm: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4">
      <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl">
        <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-rose-50 text-rose-600"><Trash2 size={19} /></div>
        <h2 className="font-bold text-slate-900">Hapus transaksi?</h2>
        <p className="mt-2 text-sm leading-6 text-slate-500">Transaksi <b className="text-slate-700">{item.transaction_number}</b> akan dihapus permanen dari buku kas.</p>
        <div className="mt-6 flex gap-2">
          <button onClick={onClose} className="flex-1 rounded-xl border border-slate-200 py-3 text-xs font-bold text-slate-600">Batal</button>
          <button onClick={onConfirm} className="flex-1 rounded-xl bg-rose-600 py-3 text-xs font-bold text-white">Hapus Transaksi</button>
        </div>
      </div>
    </div>
  );
}

export default App;
