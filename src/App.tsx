import React, { FormEvent, useCallback, useEffect, useMemo, useState } from 'react';
import {
  BarChart3, BookOpen, Building2, Check, CheckCircle2, ChevronDown, ChevronRight,
  CircleDollarSign, Clock, CreditCard, Download, Edit3, FileBarChart, FileText,
  Hotel, LayoutDashboard, MapPin, Plus, Printer, Receipt, Search,
  Settings2, ShieldCheck, Tags, Trash2, Users, Wallet,
  Wifi, X, Zap, Home, BookMarked, Scale, ListOrdered, ArrowLeftRight,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';

/* ΓöÇΓöÇΓöÇ TYPES ΓöÇΓöÇΓöÇ */
type Category = 'Listrik' | 'Air' | 'Internet/WiFi' | 'Kebersihan' | 'Perawatan & Perbaikan' | 'Gaji Karyawan' | 'Perlengkapan Kos' | 'Biaya Lainnya';
type PaymentStatus = 'Lunas' | 'Belum Lunas' | 'Sebagian';
type PaymentMethod = 'Kas Tunai (Petty Cash)' | 'Transfer Bank' | 'QRIS' | 'Kartu Debit' | 'Lainnya';

type Expense = {
  id: string;
  transaction_date: string;
  transaction_number: string;
  description: string;
  category: Category;
  amount: number;
  status: PaymentStatus;
  payment_method: PaymentMethod;
  unit_kamar: string;
  vendor: string;
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
  unit_kamar: string;
  vendor: string;
};

type Tab = 'dashboard' | 'transaksi' | 'laporan' | 'buku-besar' | 'kategori' | 'pengaturan';

/* ─── ACCOUNTING TYPES ─── */
type JenisAkun = 'Aset' | 'Kewajiban' | 'Ekuitas' | 'Pendapatan' | 'Beban';
type Akun = { kode: string; nama: string; jenis: JenisAkun; sub_jenis: string; saldo_normal: 'Debit' | 'Kredit'; };
type JurnalUmum = { id: string; nomor_jurnal: string; tanggal: string; keterangan: string; expense_id: string | null; dibuat_oleh: string; created_at: string; };
type JurnalDetail = { id: string; jurnal_id: string; kode_akun: string; posisi: 'Debit' | 'Kredit'; nominal: number; keterangan: string; };
type JurnalWithDetail = JurnalUmum & { details: JurnalDetail[]; };
type SubTabBB = 'jurnal' | 'buku-besar' | 'neraca-saldo' | 'akun';

/* ΓöÇΓöÇΓöÇ CONSTANTS ΓöÇΓöÇΓöÇ */
const categories: Category[] = ['Listrik', 'Air', 'Internet/WiFi', 'Kebersihan', 'Perawatan & Perbaikan', 'Gaji Karyawan', 'Perlengkapan Kos', 'Biaya Lainnya'];
const paymentMethods: PaymentMethod[] = ['Kas Tunai (Petty Cash)', 'Transfer Bank', 'QRIS', 'Kartu Debit', 'Lainnya'];
const unitOptions = ['Semua Kamar', 'Lantai 1', 'Lantai 2', 'Lantai 3', 'Kamar 101', 'Kamar 102', 'Kamar 103', 'Kamar 201', 'Kamar 202', 'Kamar 203', 'Kamar 204', 'Kamar 205', 'Kamar 301', 'Kamar 302', 'Kamar 303', 'Area Umum', 'Dapur', 'Parkir', 'Lainnya'];

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

const statusConfig: Record<PaymentStatus, { color: string; label: string; icon: typeof Check }> = {
  'Lunas':       { color: 'border-emerald-200 bg-emerald-50 text-emerald-700', label: 'Lunas (Sudah Dibayar)', icon: Check },
  'Belum Lunas': { color: 'border-rose-200 bg-rose-50 text-rose-700',         label: 'Belum Lunas (Perlu Pelunasan)', icon: Clock },
  'Sebagian':    { color: 'border-amber-200 bg-amber-50 text-amber-700',       label: 'Sebagian (DP / Cicilan)', icon: Clock },
};

const methodConfig: Record<PaymentMethod, string> = {
  'Kas Tunai (Petty Cash)': 'bg-slate-100 text-slate-600',
  'Transfer Bank':           'bg-blue-50 text-blue-600',
  'QRIS':                    'bg-purple-50 text-purple-600',
  'Kartu Debit':             'bg-teal-50 text-teal-600',
  'Lainnya':                 'bg-slate-100 text-slate-500',
};

/* ─── ACCOUNTING MAPPINGS ─── */
// Mapping kategori pengeluaran → kode akun beban
const CATEGORY_TO_AKUN: Record<Category, string> = {
  'Listrik':               '5-1100',
  'Air':                   '5-1200',
  'Internet/WiFi':         '5-1300',
  'Kebersihan':            '5-2100',
  'Perawatan & Perbaikan': '5-2200',
  'Gaji Karyawan':         '5-2300',
  'Perlengkapan Kos':      '5-2400',
  'Biaya Lainnya':         '5-9100',
};
// Mapping metode pembayaran → kode akun kredit (kas/bank)
const METHOD_TO_AKUN: Record<string, string> = {
  'Kas Tunai (Petty Cash)': '1-1100',
  'Tunai':                  '1-1100',
  'Transfer Bank':          '1-1300',
  'QRIS':                   '1-1300',
  'Kartu Debit':            '1-1200',
  'Debit':                  '1-1200',
  'Lainnya':                '1-1100',
};

const propertyPhotos = [
  { url: 'https://images.pexels.com/photos/6487950/pexels-photo-6487950.jpeg?auto=compress&cs=tinysrgb&h=650&w=940', label: 'Kamar', title: 'Kamar Single Cozy & Terang' },
  { url: 'https://images.pexels.com/photos/33389378/pexels-photo-33389378.jpeg?auto=compress&cs=tinysrgb&h=650&w=940', label: 'Pantry', title: 'Dapur Komunal Bersih' },
  { url: 'https://images.pexels.com/photos/15143517/pexels-photo-15143517.jpeg?auto=compress&cs=tinysrgb&h=650&w=940', label: 'Parkir', title: 'Area Parkir Aman & Beratap' },
];

/* ΓöÇΓöÇΓöÇ HELPERS ΓöÇΓöÇΓöÇ */
const rupiah = (n: number) =>
  new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(n);

const dateText = (d: string) =>
  new Intl.DateTimeFormat('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(`${d}T00:00:00`));

// Format BKK: BKK-YYMMDD-NNN  e.g. BKK-261103-005
function makeBkkNumber(date: string, count: number): string {
  const ymd = date.replace(/-/g, '').substring(2); // '261103'
  return `BKK-${ymd}-${String(count + 1).padStart(3, '0')}`;
}

const today = new Date().toISOString().split('T')[0];

function newForm(count: number): FormState {
  return {
    transaction_date: today,
    transaction_number: makeBkkNumber(today, count),
    description: '',
    category: 'Listrik',
    amount: '',
    status: 'Lunas',
    payment_method: 'Kas Tunai (Petty Cash)',
    unit_kamar: 'Semua Kamar',
    vendor: '',
  };
}

/* ΓöÇΓöÇΓöÇ APP ΓöÇΓöÇΓöÇ */
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

  const notify = useCallback((msg: string) => { setNotice(msg); window.setTimeout(() => setNotice(null), 3200); }, []);

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase.from('cash_expenses').select('*').order('transaction_date', { ascending: false });
    if (error) { notify('Data transaksi belum dapat dimuat.'); setLoading(false); return; }
    setExpenses((data ?? []) as Expense[]);
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

  const total         = expenses.reduce((s, e) => s + Number(e.amount), 0);
  const totalLunas    = expenses.filter((e) => (e.status ?? 'Lunas') === 'Lunas').reduce((s, e) => s + Number(e.amount), 0);
  const totalBelum    = expenses.filter((e) => (e.status ?? 'Lunas') !== 'Lunas').reduce((s, e) => s + Number(e.amount), 0);
  const utilities     = expenses.filter((e) => ['Listrik', 'Air', 'Internet/WiFi'].includes(e.category)).reduce((s, e) => s + Number(e.amount), 0);
  const unpaidList    = expenses.filter((e) => (e.status ?? 'Lunas') !== 'Lunas');
  const ratio         = total ? Math.round((totalLunas / total) * 100) : 100;

  const filtered = useMemo(() => expenses.filter((item) => {
    const q = query.toLowerCase();
    const matchSearch   = `${item.transaction_number} ${item.description} ${item.category} ${item.vendor ?? ''} ${item.unit_kamar ?? ''}`.toLowerCase().includes(q);
    const matchCategory = categoryFilter === 'Semua Kategori' || item.category === categoryFilter;
    const matchStatus   = statusFilter === 'Semua Status' || (item.status ?? 'Lunas') === statusFilter;
    let   matchDate     = true;
    if (periodMode === 'bulan' && dateFilter !== 'semua') matchDate = item.transaction_date.startsWith(dateFilter);
    else if (periodMode === 'tahun' && dateFilter !== 'semua') matchDate = item.transaction_date.startsWith(dateFilter);
    return matchSearch && matchCategory && matchStatus && matchDate;
  }), [expenses, query, categoryFilter, statusFilter, dateFilter, periodMode]);

  const categoryTotals = categories
    .map((cat) => ({ category: cat, amount: expenses.filter((e) => e.category === cat).reduce((s, e) => s + Number(e.amount), 0) }))
    .filter((e) => e.amount > 0).sort((a, b) => b.amount - a.amount);

  const openAdd = () => { setEditing(null); setForm(newForm(expenses.length)); setModal('add'); };
  const openEdit = (item: Expense) => {
    setEditing(item);
    setForm({
      transaction_date:   item.transaction_date,
      transaction_number: item.transaction_number,
      description:        item.description,
      category:           item.category,
      amount:             String(item.amount),
      status:             item.status        ?? 'Lunas',
      payment_method:     (item.payment_method as PaymentMethod) ?? 'Kas Tunai (Petty Cash)',
      unit_kamar:         item.unit_kamar    ?? 'Semua Kamar',
      vendor:             item.vendor        ?? '',
    });
    setModal('edit');
  };

  const save = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const { status, payment_method, unit_kamar, vendor, ...core } = form;
    const corePayload = { ...core, amount: Number(form.amount) };
    const fullPayload = { ...corePayload, status, payment_method, unit_kamar, vendor };

    if (!corePayload.description || !corePayload.transaction_number || !corePayload.amount) {
      notify('Lengkapi semua data wajib terlebih dahulu.'); return;
    }

    let result = editing
      ? await supabase.from('cash_expenses').update(fullPayload).eq('id', editing.id).select('*').maybeSingle()
      : await supabase.from('cash_expenses').insert(fullPayload).select('*').maybeSingle();

    // Fallback jika kolom baru belum ada di DB
    if (result.error) {
      const fallback = { ...corePayload, status, payment_method };
      result = editing
        ? await supabase.from('cash_expenses').update(fallback).eq('id', editing.id).select('*').maybeSingle()
        : await supabase.from('cash_expenses').insert(fallback).select('*').maybeSingle();
    }

    if (result.error || !result.data) {
      notify('Gagal menyimpan: ' + (result.error?.message ?? 'data kosong')); return;
    }
    setExpenses((items) =>
      editing ? items.map((i) => (i.id === editing.id ? (result.data as Expense) : i)) : [result.data as Expense, ...items]
    );
    setModal(null);
    notify(editing ? 'Transaksi berhasil diperbarui.' : 'Transaksi berhasil dicatat.');
  };

  const lunaskan = async (item: Expense) => {
    const { error } = await supabase
      .from('cash_expenses')
      .update({ status: 'Lunas' })
      .eq('id', item.id);
    if (error) { notify('Gagal melunaskan transaksi.'); return; }
    setExpenses((items) => items.map((i) => i.id === item.id ? { ...i, status: 'Lunas' } : i));
    notify(`Γ£à ${item.transaction_number} berhasil dilunaskan.`);
  };

  const remove = async () => {
    if (!removeTarget) return;
    const { error } = await supabase.from('cash_expenses').delete().eq('id', removeTarget.id);
    if (error) { notify('Transaksi belum dapat dihapus.'); return; }
    setExpenses((items) => items.filter((i) => i.id !== removeTarget.id));
    setRemoveTarget(null);
    notify('Transaksi berhasil dihapus.');
  };

  const exportCsv = () => {
    const csv = [
      ['Tanggal', 'No. BKK', 'Uraian', 'Kategori', 'Unit/Kamar', 'Vendor', 'Nominal', 'Metode', 'Status'],
      ...filtered.map((e) => [
        e.transaction_date, e.transaction_number, e.description, e.category,
        e.unit_kamar ?? 'Semua Kamar', e.vendor ?? '-', String(e.amount),
        e.payment_method ?? 'Kas Tunai (Petty Cash)', e.status ?? 'Lunas',
      ]),
    ].map((row) => row.map((v) => `"${v.replace(/"/g, '""')}"`).join(',')).join('\n');
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
    a.download = 'laporan-kas-keluar.csv'; a.click();
    notify('Laporan berhasil diekspor.');
  };

  const saveProfile = async (next: typeof profile) => {
    const { error } = await supabase.from('property_settings').update({ ...next, updated_at: new Date().toISOString() }).eq('id', 1);
    if (error) { notify('Profil belum dapat disimpan.'); return; }
    setProfile(next); notify('Profil usaha berhasil disimpan.');
  };

  const tabs: { id: Tab; label: string; icon: typeof LayoutDashboard }[] = [
    { id: 'dashboard', label: 'Dashboard',          icon: LayoutDashboard },
    { id: 'transaksi', label: 'Buku Transaksi',      icon: Receipt },
    { id: 'buku-besar',label: 'Buku Besar',          icon: BookOpen },
    { id: 'laporan',   label: 'Laporan',             icon: FileBarChart },
    { id: 'kategori',  label: 'Kategori',            icon: Tags },
    { id: 'pengaturan',label: 'Pengaturan',          icon: Settings2 },
  ];

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 selection:bg-emerald-100 selection:text-emerald-900 animate-fade-in">
      <header className="sticky top-0 z-30 border-b border-slate-200/80 bg-white/95 shadow-sm backdrop-blur-md">
        <div className="mx-auto flex h-[72px] max-w-[1440px] items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
          <div className="flex min-w-0 items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-700 text-white shadow-md shadow-emerald-500/25"><Hotel size={20} /></div>
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
              <Icon size={16} />{label.replace('Laporan Akuntansi','Laporan').replace('Buku Transaksi','Transaksi').replace('Master Kategori','Kategori')}
            </button>
          ))}
        </nav>
      </header>

        <main className="mx-auto max-w-[1440px] space-y-6 px-4 py-6 sm:px-6 lg:px-8 animate-fade-in">
        {tab === 'dashboard'  && <Dashboard expenses={expenses} total={total} totalLunas={totalLunas} totalBelum={totalBelum} utilities={utilities} unpaidList={unpaidList} ratio={ratio} categoryTotals={categoryTotals} loading={loading} photo={photo} setPhoto={setPhoto} openAdd={openAdd} setTab={setTab} openEdit={openEdit} setRemoveTarget={setRemoveTarget} onLunaskan={lunaskan} />}
        {tab === 'transaksi'  && <Transactions expenses={filtered} allExpenses={expenses} query={query} setQuery={setQuery} categoryFilter={categoryFilter} setCategoryFilter={setCategoryFilter} statusFilter={statusFilter} setStatusFilter={setStatusFilter} dateFilter={dateFilter} setDateFilter={setDateFilter} periodMode={periodMode} setPeriodMode={setPeriodMode} openAdd={openAdd} openEdit={openEdit} setRemoveTarget={setRemoveTarget} exportCsv={exportCsv} loading={loading} onLunaskan={lunaskan} />}
        {tab === 'buku-besar' && <BukuBesar expenses={expenses} />}
        {tab === 'laporan'    && <Reports expenses={expenses} categoryTotals={categoryTotals} exportCsv={exportCsv} />}
        {tab === 'kategori'   && <Categories categoryTotals={categoryTotals} />}
        {tab === 'pengaturan' && <SettingsPage profile={profile} onSave={saveProfile} />}
        </main>

      {notice && (
        <div className="fixed bottom-5 right-5 z-50 flex items-center gap-3 rounded-2xl bg-slate-900 px-5 py-3.5 text-xs font-medium text-white shadow-2xl animate-slide-up">
          <CheckCircle2 size={17} className="text-emerald-400" />{notice}
        </div>
      )}
      {modal    && <ExpenseModal mode={modal} form={form} setForm={setForm} onClose={() => setModal(null)} onSubmit={save} expenseCount={expenses.length} />}
      {removeTarget && <ConfirmDelete item={removeTarget} onClose={() => setRemoveTarget(null)} onConfirm={() => void remove()} />}
    </div>
  );
}

/* ΓöÇΓöÇΓöÇ DASHBOARD ΓöÇΓöÇΓöÇ */
function Dashboard({ expenses, total, totalLunas, totalBelum, utilities, unpaidList, ratio, categoryTotals, loading, photo, setPhoto, openAdd, setTab, openEdit, setRemoveTarget, onLunaskan }: {
  expenses: Expense[]; total: number; totalLunas: number; totalBelum: number; utilities: number;
  unpaidList: Expense[]; ratio: number; categoryTotals: { category: Category; amount: number }[];
  loading: boolean; photo: number; setPhoto: (v: number) => void; openAdd: () => void;
  setTab: (t: Tab) => void; openEdit: (e: Expense) => void; setRemoveTarget: (e: Expense) => void;
  onLunaskan: (e: Expense) => void;
}) {
  return (
    <>
      <section className="overflow-hidden rounded-3xl border border-slate-100 bg-white shadow-md">
        <div className="grid lg:grid-cols-12">
          <div className="flex flex-col justify-between space-y-6 bg-gradient-to-br from-white via-slate-50 to-emerald-50/60 p-6 sm:p-8 lg:col-span-7">
            <div>
              <div className="mb-3 flex flex-wrap gap-2">
                <span className="rounded-full border border-rose-200 bg-rose-50 px-3 py-1 text-[11px] font-bold text-rose-700">Kost Putri Eksklusif & Asri</span>
                <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-[11px] font-semibold text-emerald-700"><span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-500" /> Okupansi: 21 / 24 Kamar</span>
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
              {propertyPhotos.map((item, idx) => (
                <button key={item.label} onClick={() => setPhoto(idx)} className={`relative h-12 overflow-hidden rounded-xl border-2 transition ${photo === idx ? 'border-emerald-500' : 'border-transparent hover:border-slate-300'}`}>
                  <img src={item.url} alt={item.label} className="h-full w-full object-cover" />
                  <span className="absolute inset-x-0 bottom-0 bg-slate-950/70 py-0.5 text-[9px] font-semibold text-white">{item.label}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <Metric title="Kas Terealisasi"  value={rupiah(totalLunas)} icon={Wallet}       tone="green" note={`${expenses.filter(e=>(e.status??'Lunas')==='Lunas').length} Trx lunas`} />
        <Metric title="Belum Dilunasi"   value={rupiah(totalBelum)} icon={CircleDollarSign} tone="rose"  note={`${unpaidList.length} Trx pending`} />
        <Metric title="Utilitas & WiFi"  value={rupiah(utilities)}  icon={Zap}          tone="amber" note="Listrik / Air / Net" />
        <Metric title="Total Beban"      value={rupiah(total)}      icon={BarChart3}     tone="blue"  note={`${expenses.length} Trx tercatat`} />
        <Metric title="Rasio Pelunasan"  value={`${ratio}%`}        icon={CheckCircle2} tone="green" note="Realisasi kas" />
      </section>

      <MonthlyChart expenses={expenses} />

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
                <div className="h-2 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-emerald-500" style={{ width: `${Math.max((amount/(total||1))*100,5)}%` }} /></div>
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
          {unpaidList.length === 0
            ? <p className="py-8 text-center text-xs text-slate-400">Semua tagihan sudah lunas. Γ£à</p>
            : <TransactionTable expenses={unpaidList.slice(0, 5)} loading={loading} openEdit={openEdit} setRemoveTarget={setRemoveTarget} onLunaskan={onLunaskan} compact />
          }
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-slate-100 p-5">
          <div><h2 className="text-sm font-bold text-slate-900">Riwayat 5 Kas Keluar Terkini</h2><p className="mt-1 text-xs text-slate-500">Aktivitas arus kas terbaru di Harmoni Residence</p></div>
          <button onClick={() => setTab('transaksi')} className="text-xs font-bold text-emerald-700">Buku Transaksi Lengkap ΓåÆ</button>
        </div>
        <TransactionTable expenses={expenses.slice(0, 5)} loading={loading} openEdit={openEdit} setRemoveTarget={setRemoveTarget} onLunaskan={onLunaskan} compact />
      </section>
    </>
  );
}

/* ΓöÇΓöÇΓöÇ MONTHLY CHART ΓöÇΓöÇΓöÇ */
function MonthlyChart({ expenses }: { expenses: Expense[] }) {
  const mNames: Record<string,string> = {'01':'Jan','02':'Feb','03':'Mar','04':'Apr','05':'Mei','06':'Jun','07':'Jul','08':'Agt','09':'Sep','10':'Okt','11':'Nov','12':'Des'};
  const monthMap: Record<string,number> = {};
  expenses.forEach((e) => { const k = e.transaction_date.substring(0,7); monthMap[k]=(monthMap[k]??0)+Number(e.amount); });
  const bars = Object.keys(monthMap).sort().slice(-6).map((ym) => { const [,m]=ym.split('-'); return {label:mNames[m]??m, amount:monthMap[ym], key:ym}; });
  const max = Math.max(...bars.map(b=>b.amount),1);
  const cur = new Date().toISOString().substring(0,7);
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between">
        <div><h2 className="text-sm font-bold text-slate-900">Grafik Pengeluaran Bulanan</h2><p className="mt-1 text-xs text-slate-500">Perbandingan kas keluar 6 bulan terakhir.</p></div>
        <span className="rounded-lg bg-emerald-50 px-2.5 py-1 text-[10px] font-bold text-emerald-700">{new Date().getFullYear()}</span>
      </div>
      <div className="mt-6 flex h-44 items-end gap-3 border-b border-l border-slate-100 px-3 sm:gap-6 sm:px-8">
        {bars.length===0 ? <p className="w-full py-10 text-center text-xs text-slate-400">Belum ada data.</p>
          : bars.map((item) => (
            <div key={item.key} className="flex h-full flex-1 flex-col items-center justify-end gap-1">
              <span className="text-[9px] font-semibold text-slate-400">{rupiah(item.amount).replace('Rp\u00a0','Rp').replace(/\.000$/,'rb')}</span>
              <div className={`w-full max-w-10 rounded-t-lg transition hover:opacity-80 ${item.key===cur?'bg-emerald-600':'bg-emerald-300'}`} style={{height:`${Math.max((item.amount/max)*75,6)}%`}} />
              <span className={`text-[10px] ${item.key===cur?'font-bold text-emerald-700':'text-slate-500'}`}>{item.label}</span>
            </div>
          ))
        }
      </div>
    </section>
  );
}

/* ΓöÇΓöÇΓöÇ TRANSAKSI ΓöÇΓöÇΓöÇ */
function Transactions({ expenses, allExpenses, query, setQuery, categoryFilter, setCategoryFilter, statusFilter, setStatusFilter, dateFilter, setDateFilter, periodMode, setPeriodMode, openAdd, openEdit, setRemoveTarget, exportCsv, loading, onLunaskan }: {
  expenses: Expense[]; allExpenses: Expense[]; query: string; setQuery: (v:string)=>void;
  categoryFilter: 'Semua Kategori'|Category; setCategoryFilter: (v:'Semua Kategori'|Category)=>void;
  statusFilter: 'Semua Status'|PaymentStatus; setStatusFilter: (v:'Semua Status'|PaymentStatus)=>void;
  dateFilter: string; setDateFilter: (v:string)=>void;
  periodMode: 'semua'|'bulan'|'tahun'; setPeriodMode: (v:'semua'|'bulan'|'tahun')=>void;
  openAdd:()=>void; openEdit:(e:Expense)=>void; setRemoveTarget:(e:Expense)=>void;
  exportCsv:()=>void; loading:boolean; onLunaskan:(e:Expense)=>void;
}) {
  const uniqueYears  = [...new Set(allExpenses.map(e=>e.transaction_date.substring(0,4)))].sort((a,b)=>b.localeCompare(a));
  const uniqueMonths = [...new Set(allExpenses.map(e=>e.transaction_date.substring(0,7)))].sort((a,b)=>b.localeCompare(a));
  const mNames: Record<string,string> = {'01':'Januari','02':'Februari','03':'Maret','04':'April','05':'Mei','06':'Juni','07':'Juli','08':'Agustus','09':'September','10':'Oktober','11':'November','12':'Desember'};
  const handleMode = (mode:'semua'|'bulan'|'tahun') => { setPeriodMode(mode); setDateFilter('semua'); };

  return (
    <>
      <PageTitle eyebrow="Pencatatan kas" title="Buku Pengeluaran Kas" description="Daftar menyeluruh transaksi pembiayaan dan operasional Harmoni Residence."
        action={<button onClick={openAdd} className="flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-3 text-xs font-bold text-white"><Plus size={16} /> Catat Transaksi</button>} />
      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-wrap gap-3 border-b border-slate-100 p-4">
          <label className="relative min-w-[200px] flex-1">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Cari uraian, nomor BKK, vendor, kategori..." className="form-input pl-9" />
          </label>
          <select value={categoryFilter} onChange={e=>setCategoryFilter(e.target.value as 'Semua Kategori'|Category)} className="form-input w-auto">
            <option>Semua Kategori</option>{categories.map(c=><option key={c}>{c}</option>)}
          </select>
          <select value={statusFilter} onChange={e=>setStatusFilter(e.target.value as 'Semua Status'|PaymentStatus)} className="form-input w-auto">
            <option>Semua Status</option><option>Lunas</option><option>Belum Lunas</option><option>Sebagian</option>
          </select>
          <div className="flex overflow-hidden rounded-xl border border-slate-200">
            {(['semua','bulan','tahun'] as const).map(mode=>(
              <button key={mode} onClick={()=>handleMode(mode)} className={`px-3 py-2.5 text-xs font-bold transition ${periodMode===mode?'bg-emerald-600 text-white':'bg-white text-slate-500 hover:bg-slate-50'}`}>
                {mode==='semua'?'Semua':mode==='bulan'?'Per Bulan':'Per Tahun'}
              </button>
            ))}
          </div>
          {periodMode!=='semua' && (
            <select value={dateFilter} onChange={e=>setDateFilter(e.target.value)} className="form-input w-auto">
              <option value="semua">{periodMode==='bulan'?'Pilih Bulan':'Pilih Tahun'}</option>
              {periodMode==='bulan'
                ? uniqueMonths.map(ym=>{const[y,m]=ym.split('-');return<option key={ym} value={ym}>{mNames[m]} {y}</option>;})
                : uniqueYears.map(y=><option key={y} value={y}>Tahun {y}</option>)}
            </select>
          )}
          <button onClick={exportCsv} className="flex items-center gap-2 rounded-xl border border-slate-200 px-4 text-xs font-bold text-slate-600 hover:bg-slate-50"><Download size={15} /> Unduh CSV</button>
        </div>
        {(query||categoryFilter!=='Semua Kategori'||statusFilter!=='Semua Status'||(periodMode!=='semua'&&dateFilter!=='semua')) && (
          <div className="flex items-center justify-between border-b border-slate-100 bg-emerald-50 px-4 py-2">
            <span className="text-xs font-medium text-emerald-700">Menampilkan <b>{expenses.length}</b> transaksi</span>
            <button onClick={()=>{setQuery('');setCategoryFilter('Semua Kategori');setStatusFilter('Semua Status');handleMode('semua');}} className="text-xs font-bold text-emerald-700 hover:underline">Reset Filter</button>
          </div>
        )}
        <TransactionTable expenses={expenses} loading={loading} openEdit={openEdit} setRemoveTarget={setRemoveTarget} onLunaskan={onLunaskan} />
      </div>
    </>
  );
}

/* ΓöÇΓöÇΓöÇ LAPORAN ΓöÇΓöÇΓöÇ */
function Reports({ expenses, categoryTotals, exportCsv }: { expenses: Expense[]; categoryTotals:{category:Category;amount:number}[]; exportCsv:()=>void }) {
  const total      = expenses.reduce((s,e)=>s+Number(e.amount),0);
  const totalLunas = expenses.filter(e=>(e.status??'Lunas')==='Lunas').reduce((s,e)=>s+Number(e.amount),0);
  const totalBelum = expenses.filter(e=>(e.status??'Lunas')!=='Lunas').reduce((s,e)=>s+Number(e.amount),0);
  return (
    <>
      <PageTitle eyebrow="Standard accounting suite" title="Laporan Akuntansi Kas Keluar" description="Rekapitulasi beban operasional dan evaluasi arus kas Harmoni Residence."
        action={<div className="flex gap-2"><button onClick={()=>window.print()} className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 text-xs font-bold text-slate-600"><Printer size={15}/> Cetak</button><button onClick={exportCsv} className="flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-3 text-xs font-bold text-white"><Download size={15}/> Ekspor</button></div>} />
      <div className="grid gap-4 sm:grid-cols-3">
        <Metric title="Total Beban"      value={rupiah(total)}      icon={CircleDollarSign} tone="blue"  note="Seluruh periode" />
        <Metric title="Kas Terealisasi"  value={rupiah(totalLunas)} icon={CheckCircle2}     tone="green" note="Sudah dilunasi" />
        <Metric title="Belum Dilunasi"   value={rupiah(totalBelum)} icon={Clock}            tone="rose"  note={`${expenses.filter(e=>(e.status??'Lunas')!=='Lunas').length} transaksi`} />
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
                {categoryTotals.map(({category,amount})=>(
                  <tr key={category}>
                    <td className="py-3 font-semibold text-slate-700">{category}</td>
                    <td className="py-3 text-center text-slate-500">{expenses.filter(e=>e.category===category).length}</td>
                    <td className="py-3 text-right font-bold text-slate-800">{rupiah(amount)}</td>
                    <td className="py-3 text-right font-bold text-emerald-700">{total?`${((amount/total)*100).toFixed(1)}%`:'0%'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm lg:col-span-2">
          <h2 className="text-sm font-bold text-slate-900">Ringkasan Status Pembayaran</h2>
          <div className="mt-5 space-y-3">
            {(['Lunas','Belum Lunas','Sebagian'] as PaymentStatus[]).map(s=>{
              const cnt = expenses.filter(e=>(e.status??'Lunas')===s).length;
              const amt = expenses.filter(e=>(e.status??'Lunas')===s).reduce((sum,e)=>sum+Number(e.amount),0);
              return (
                <div key={s} className="flex items-center justify-between rounded-xl border border-slate-100 bg-slate-50 p-3">
                  <div className="flex items-center gap-2"><StatusBadge status={s} /><span className="text-xs text-slate-500">{cnt} transaksi</span></div>
                  <b className="text-xs text-slate-800">{rupiah(amt)}</b>
                </div>
              );
            })}
          </div>
          <div className="mt-5 rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs text-slate-600">
            <b className="text-slate-800">Verifikasi rutin</b>
            <p className="mt-1 leading-5 text-slate-500">Cocokkan buku kas dengan bukti pembayaran setiap akhir periode.</p>
          </div>
        </div>
      </div>
    </>
  );
}

/* ΓöÇΓöÇΓöÇ KATEGORI ΓöÇΓöÇΓöÇ */
function Categories({ categoryTotals }: { categoryTotals:{category:Category;amount:number}[] }) {
  return (
    <>
      <PageTitle eyebrow="Master data" title="Kategori Biaya Operasional" description="Daftar pos pengeluaran yang digunakan dalam pencatatan kas keluar." />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {categories.map(cat=>(
          <div key={cat} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className={`mb-5 flex h-10 w-10 items-center justify-center rounded-xl border ${categoryColors[cat]}`}><Tags size={18}/></div>
            <h2 className="text-sm font-bold text-slate-800">{cat}</h2>
            <p className="mt-2 text-xs text-slate-500">{categoryTotals.find(e=>e.category===cat)?.amount ? rupiah(categoryTotals.find(e=>e.category===cat)?.amount??0) : 'Belum ada transaksi'}</p>
          </div>
        ))}
      </div>
    </>
  );
}

/* ΓöÇΓöÇΓöÇ PENGATURAN ΓöÇΓöÇΓöÇ */
function SettingsPage({ profile, onSave }: { profile:{business_name:string;business_address:string;manager_name:string}; onSave:(p:typeof profile)=>Promise<void> }) {
  const [draft, setDraft] = useState(profile);
  useEffect(()=>setDraft(profile),[profile]);
  return (
    <>
      <PageTitle eyebrow="Preferensi aplikasi" title="Pengaturan" description="Kelola profil usaha kos dan informasi akun administrator." />
      <div className="grid max-w-5xl gap-6 lg:grid-cols-[220px_1fr]">
        <div className="rounded-2xl border border-slate-200 bg-white p-2 shadow-sm">
          <div className="flex items-center gap-3 rounded-xl bg-emerald-50 px-4 py-3 text-xs font-bold text-emerald-700"><Settings2 size={16}/> Profil usaha</div>
          <div className="mt-1 flex items-center gap-3 rounded-xl px-4 py-3 text-xs font-medium text-slate-500"><Users size={16}/> Akun pengguna</div>
        </div>
        <form onSubmit={e=>{e.preventDefault();void onSave(draft);}} className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="border-b border-slate-100 pb-5"><h2 className="text-sm font-bold text-slate-900">Informasi usaha kos</h2><p className="mt-1 text-xs text-slate-500">Informasi ini akan tampil di laporan.</p></div>
          <div className="mt-6 space-y-5">
            <label><span className="form-label">Nama usaha</span><input value={draft.business_name} onChange={e=>setDraft({...draft,business_name:e.target.value})} className="form-input" required /></label>
            <label><span className="form-label">Alamat usaha</span><textarea value={draft.business_address} onChange={e=>setDraft({...draft,business_address:e.target.value})} rows={3} className="form-input resize-none" required /></label>
            <label><span className="form-label">Nama administrator</span><input value={draft.manager_name} onChange={e=>setDraft({...draft,manager_name:e.target.value})} className="form-input" required /></label>
            <div className="flex justify-end border-t border-slate-100 pt-5"><button type="submit" className="rounded-xl bg-emerald-600 px-5 py-3 text-xs font-bold text-white">Simpan Perubahan</button></div>
          </div>
        </form>
      </div>
    </>
  );
}

/* ΓöÇΓöÇΓöÇ SHARED COMPONENTS ΓöÇΓöÇΓöÇ */
function Amenity({ icon: Icon, label, tone }: { icon: typeof Wifi; label: string; tone: 'green'|'blue'|'rose'|'amber' }) {
  const s = { green:'bg-emerald-100 text-emerald-700', blue:'bg-sky-100 text-sky-700', rose:'bg-rose-100 text-rose-700', amber:'bg-amber-100 text-amber-700' };
  return <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white p-2 shadow-sm"><div className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ${s[tone]}`}><Icon size={13}/></div><span className="text-[10px] font-semibold leading-tight text-slate-700">{label}</span></div>;
}

function Metric({ title, value, icon: Icon, tone, note }: { title:string; value:string; icon:typeof Wallet; tone:'green'|'rose'|'amber'|'blue'; note:string }) {
  const iconBg = { green:'bg-emerald-500', rose:'bg-rose-500', amber:'bg-amber-500', blue:'bg-blue-500' };
  return (
    <div className="flex min-h-[132px] flex-col justify-between rounded-2xl border border-slate-100 bg-white p-5 shadow-sm transition-shadow hover:shadow-md">
      <div className="flex items-start justify-between gap-2">
        <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">{title}</span>
        <span className={`flex h-9 w-9 items-center justify-center rounded-xl ${iconBg[tone]} text-white shadow-sm`}><Icon size={16}/></span>
      </div>
      <div><p className="text-xl font-bold tracking-tight text-slate-900">{value}</p><p className="mt-1 text-[11px] font-medium text-slate-400">{note}</p></div>
    </div>
  );
}

function PageTitle({ eyebrow, title, description, action }: { eyebrow:string; title:string; description:string; action?:React.ReactNode }) {
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
  return <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-1 text-[10px] font-bold ${cfg.color}`}><Icon size={11}/>{s}</span>;
}

function TransactionTable({ expenses, loading, openEdit, setRemoveTarget, onLunaskan, compact=false }: {
  expenses:Expense[]; loading:boolean; openEdit:(e:Expense)=>void; setRemoveTarget:(e:Expense)=>void; onLunaskan?:(e:Expense)=>void; compact?:boolean;
}) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[860px] text-left text-xs">
        <thead className="border-b border-slate-100 bg-slate-50/70 text-[10px] font-bold uppercase tracking-widest text-slate-400">
          <tr>
            <th className="px-4 py-3">No. BKK / Tgl</th>
            <th className="px-4 py-3">Kategori & Uraian</th>
            <th className="px-4 py-3">Unit / Vendor</th>
            <th className="px-4 py-3">Nominal</th>
            <th className="px-4 py-3">Metode</th>
            <th className="px-4 py-3 text-center">Status</th>
            <th className="px-4 py-3 text-center">Aksi</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {loading
            ? <tr><td colSpan={7} className="px-4 py-10 text-center text-slate-400">Memuat transaksi...</td></tr>
            : expenses.length===0
              ? <tr><td colSpan={7} className="px-4 py-10 text-center text-slate-400">Belum ada transaksi.</td></tr>
              : expenses.map(item=>(
                <tr key={item.id} className="transition-colors hover:bg-slate-50/80">
                  <td className="whitespace-nowrap px-4 py-3">
                    <b className="font-mono text-slate-800">{item.transaction_number}</b>
                    <span className="mt-1 block text-[10px] text-slate-400">{dateText(item.transaction_date)}</span>
                  </td>
                  <td className="px-4 py-3">
                    <b className="block text-slate-800">{item.description}</b>
                    <span className={`mt-1 inline-block rounded border px-1.5 py-0.5 text-[10px] font-semibold ${categoryColors[item.category]}`}>{item.category}</span>
                  </td>
                  <td className="px-4 py-3">
                    {item.unit_kamar && item.unit_kamar !== 'Semua Kamar' && (
                      <span className="flex items-center gap-1 text-[10px] text-slate-600"><Home size={10}/>{item.unit_kamar}</span>
                    )}
                    {item.vendor && item.vendor !== '-' && (
                      <span className="mt-0.5 block text-[10px] text-slate-400">{item.vendor}</span>
                    )}
                    {(!item.unit_kamar||item.unit_kamar==='Semua Kamar')&&(!item.vendor||item.vendor==='-') && (
                      <span className="text-[10px] text-slate-300">ΓÇö</span>
                    )}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 font-extrabold text-slate-900">{rupiah(Number(item.amount))}</td>
                  <td className="whitespace-nowrap px-4 py-3">
                    <span className={`inline-flex items-center gap-1 rounded-lg px-2 py-1 text-[10px] font-semibold ${methodConfig[item.payment_method??'Kas Tunai (Petty Cash)']}`}>
                      <CreditCard size={10}/>{item.payment_method??'Kas Tunai (Petty Cash)'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center"><StatusBadge status={item.status}/></td>
                  <td className="px-4 py-3">
                    <div className="flex justify-center gap-1">
                      {onLunaskan && (item.status??'Lunas')!=='Lunas' && (
                        <button
                          onClick={()=>onLunaskan(item)}
                          className="flex items-center gap-1 rounded-lg border border-emerald-200 bg-emerald-50 px-2.5 py-1.5 text-[10px] font-bold text-emerald-700 hover:bg-emerald-100 transition"
                          title="Tandai Lunas"
                        >
                          <Check size={11}/> Lunaskan
                        </button>
                      )}
                      <button onClick={()=>openEdit(item)} className="rounded-lg p-2 text-slate-400 hover:bg-blue-50 hover:text-blue-600" title="Edit"><Edit3 size={14}/></button>
                      <button onClick={()=>setRemoveTarget(item)} className="rounded-lg p-2 text-slate-400 hover:bg-rose-50 hover:text-rose-600" title="Hapus"><Trash2 size={14}/></button>
                      {compact && <button className="rounded-lg p-2 text-slate-400 hover:bg-slate-100"><ChevronDown size={14}/></button>}
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

/* ΓöÇΓöÇΓöÇ EXPENSE MODAL ΓöÇΓöÇΓöÇ */
function ExpenseModal({ mode, form, setForm, onClose, onSubmit, expenseCount }: {
  mode:'add'|'edit'; form:FormState; setForm:(v:FormState)=>void; onClose:()=>void;
  onSubmit:(e:FormEvent<HTMLFormElement>)=>void; expenseCount:number;
}) {
  const upd = (k: keyof FormState, v: string) => setForm({...form,[k]:v});

  // Auto-update nomor BKK saat tanggal berubah (hanya mode add)
  const handleDateChange = (v: string) => {
    setForm({
      ...form,
      transaction_date: v,
      transaction_number: mode==='add' ? makeBkkNumber(v, expenseCount) : form.transaction_number,
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4 animate-fade-in">
      <div className="w-full max-w-2xl rounded-3xl bg-white shadow-2xl animate-slide-up max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between rounded-t-3xl bg-gradient-to-r from-emerald-600 to-emerald-700 px-6 py-4 text-white">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/20"><Receipt size={18}/></div>
            <div>
              <h2 className="font-bold text-base">{mode==='add'?'Catat Pengeluaran Kas Baru':'Edit Transaksi Pengeluaran'}</h2>
              <p className="text-xs text-emerald-100">Lengkapi seluruh informasi biaya operasional.</p>
            </div>
          </div>
          <button onClick={onClose} className="rounded-lg p-1 hover:bg-white/20"><X size={19}/></button>
        </div>

        <form onSubmit={onSubmit} className="p-5 space-y-3">
          {/* Baris 1: No BKK + Tanggal */}
          <div className="grid gap-3 sm:grid-cols-2">
            <label>
              <span className="form-label">Nomor BKK <span className="font-normal text-slate-400">(Otomatis)</span></span>
              <input value={form.transaction_number} onChange={e=>upd('transaction_number',e.target.value)} className="form-input font-mono" required />
            </label>
            <label>
              <span className="form-label">Tanggal Transaksi</span>
              <input type="date" value={form.transaction_date} onChange={e=>handleDateChange(e.target.value)} className="form-input" required />
            </label>
          </div>

          {/* Baris 2: Kategori + Unit/Kamar */}
          <div className="grid gap-3 sm:grid-cols-2">
            <label>
              <span className="form-label">Kategori Biaya</span>
              <select value={form.category} onChange={e=>upd('category',e.target.value)} className="form-input">
                {categories.map(c=><option key={c}>{c}</option>)}
              </select>
            </label>
            <label>
              <span className="form-label">Unit / Alokasi Kamar</span>
              <select value={form.unit_kamar} onChange={e=>upd('unit_kamar',e.target.value)} className="form-input">
                {unitOptions.map(u=><option key={u}>{u}</option>)}
              </select>
            </label>
          </div>

          {/* Uraian */}
          <label>
            <span className="form-label">Uraian / Deskripsi Pengeluaran</span>
            <textarea rows={2} value={form.description} onChange={e=>upd('description',e.target.value)}
              placeholder="Contoh: Pembelian token listrik utama 200rb x 2 & kabel cadangan"
              className="form-input resize-none" required />
          </label>

          {/* Vendor + Nominal */}
          <div className="grid gap-3 sm:grid-cols-2">
            <label>
              <span className="form-label">Vendor / Penerima Uang</span>
              <input value={form.vendor} onChange={e=>upd('vendor',e.target.value)}
                placeholder="Contoh: PLN / Pak Joko Tukang"
                className="form-input" />
            </label>
            <label>
              <span className="form-label">Nominal Biaya (Rp)</span>
              <input type="number" min="1" value={form.amount} onChange={e=>upd('amount',e.target.value)}
                placeholder="Contoh: 450000"
                className="form-input" required />
            </label>
          </div>

          {/* Metode + Status */}
          <div className="grid gap-3 sm:grid-cols-2">
            <label>
              <span className="form-label">Metode Pembayaran</span>
              <select value={form.payment_method} onChange={e=>upd('payment_method',e.target.value)} className="form-input">
                {paymentMethods.map(m=><option key={m}>{m}</option>)}
              </select>
            </label>
            <label>
              <span className="form-label">Status Pelunasan</span>
              <select value={form.status} onChange={e=>upd('status',e.target.value)} className="form-input">
                <option value="Lunas">Lunas (Sudah Dibayar)</option>
                <option value="Belum Lunas">Belum Lunas (Perlu Pelunasan Segera)</option>
                <option value="Sebagian">Sebagian (DP / Cicilan)</option>
              </select>
            </label>
          </div>

          {/* Preview badge */}
          <div className="flex items-center gap-2 rounded-xl border border-slate-100 bg-slate-50 px-3 py-2">
            <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Preview:</span>
            <StatusBadge status={form.status} />
            <span className={`inline-flex items-center gap-1 rounded-lg px-2 py-1 text-[10px] font-semibold ${methodConfig[form.payment_method]}`}>
              <CreditCard size={10}/>{form.payment_method}
            </span>
            {form.unit_kamar && form.unit_kamar!=='Semua Kamar' && (
              <span className="inline-flex items-center gap-1 rounded-lg bg-slate-100 px-2 py-1 text-[10px] font-semibold text-slate-600"><Home size={10}/>{form.unit_kamar}</span>
            )}
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-2 border-t border-slate-100 pt-3">
            <button type="button" onClick={onClose} className="rounded-xl border border-slate-200 px-5 py-2.5 text-xs font-bold text-slate-600 hover:bg-slate-50">Batal</button>
            <button type="submit" className="flex items-center gap-2 rounded-xl bg-emerald-600 px-5 py-2.5 text-xs font-bold text-white hover:bg-emerald-700">
              <Check size={14}/>{mode==='add'?'Simpan Transaksi':'Simpan Perubahan'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

/* ΓöÇΓöÇΓöÇ CONFIRM DELETE ΓöÇΓöÇΓöÇ */
function ConfirmDelete({ item, onClose, onConfirm }: { item:Expense; onClose:()=>void; onConfirm:()=>void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4 animate-fade-in">
      <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl animate-slide-up">
        <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-rose-50 text-rose-600"><Trash2 size={19}/></div>
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

/* ════════════════════════════════════════════════════════════════
   BUKU BESAR — komponen utama dengan 4 sub-tab
════════════════════════════════════════════════════════════════ */
function BukuBesar({ expenses }: { expenses: Expense[] }) {
  const [subTab, setSubTab] = useState<SubTabBB>('jurnal');
  const [akunList, setAkunList] = useState<Akun[]>([]);
  const [jurnal, setJurnal] = useState<JurnalWithDetail[]>([]);
  const [loadingBB, setLoadingBB] = useState(true);

  // Generate jurnal otomatis dari data expenses
  const generatedJurnal = useMemo<JurnalWithDetail[]>(() => {
    return expenses
      .filter(e => (e.status ?? 'Lunas') === 'Lunas')
      .map((e, idx) => {
        const kodeBeban = CATEGORY_TO_AKUN[e.category] ?? '5-9100';
        const kodeKas   = METHOD_TO_AKUN[e.payment_method ?? 'Tunai'] ?? '1-1100';
        const nomor     = `JU-${e.transaction_date.replace(/-/g,'').substring(2)}-${String(idx+1).padStart(3,'0')}`;
        return {
          id: `gen-${e.id}`,
          nomor_jurnal: nomor,
          tanggal: e.transaction_date,
          keterangan: e.description,
          expense_id: e.id,
          dibuat_oleh: 'Sistem (Auto)',
          created_at: e.created_at,
          details: [
            { id: `d1-${e.id}`, jurnal_id: `gen-${e.id}`, kode_akun: kodeBeban, posisi: 'Debit',  nominal: Number(e.amount), keterangan: e.category },
            { id: `d2-${e.id}`, jurnal_id: `gen-${e.id}`, kode_akun: kodeKas,   posisi: 'Kredit', nominal: Number(e.amount), keterangan: e.payment_method ?? 'Tunai' },
          ],
        } as JurnalWithDetail;
      })
      .sort((a,b) => b.tanggal.localeCompare(a.tanggal));
  }, [expenses]);

  // Load akun dari Supabase
  useEffect(() => {
    void (async () => {
      setLoadingBB(true);
      const { data } = await supabase.from('akun').select('*').order('kode');
      if (data) setAkunList(data as Akun[]);
      // Load jurnal manual jika ada
      const { data: jd } = await supabase
        .from('jurnal_umum')
        .select('*, jurnal_detail(*)')
        .order('tanggal', { ascending: false });
      if (jd) setJurnal(jd.map((j: JurnalUmum & { jurnal_detail: JurnalDetail[] }) => ({ ...j, details: j.jurnal_detail })) as JurnalWithDetail[]);
      setLoadingBB(false);
    })();
  }, []);

  // Gabungkan jurnal otomatis + manual (manual lebih prioritas, skip jika sudah ada expense_id)
  const manualExpenseIds = new Set(jurnal.filter(j => j.expense_id).map(j => j.expense_id));
  const allJurnal = [
    ...jurnal,
    ...generatedJurnal.filter(j => j.expense_id && !manualExpenseIds.has(j.expense_id)),
  ].sort((a,b) => b.tanggal.localeCompare(a.tanggal));

  const subTabs: { id: SubTabBB; label: string; icon: typeof BookOpen }[] = [
    { id: 'jurnal',       label: 'Jurnal Umum',   icon: ListOrdered },
    { id: 'buku-besar',   label: 'Buku Besar',    icon: BookMarked },
    { id: 'neraca-saldo', label: 'Neraca Saldo',  icon: Scale },
    { id: 'akun',         label: 'Daftar Akun',   icon: ArrowLeftRight },
  ];

  return (
    <div className="space-y-5">
      {/* Page header */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-widest text-emerald-600">Akuntansi</p>
          <h2 className="text-2xl font-bold tracking-tight text-slate-900">Buku Besar</h2>
          <p className="mt-1 text-sm text-slate-500">Pencatatan double-entry & laporan akuntansi Harmoni Residence</p>
        </div>
        <div className="flex items-center gap-2 rounded-2xl border border-slate-100 bg-white p-1 shadow-sm">
          {subTabs.map(({ id, label, icon: Icon }) => (
            <button key={id} onClick={() => setSubTab(id)}
              className={`flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-semibold transition-all ${subTab === id ? 'bg-emerald-600 text-white shadow-sm' : 'text-slate-500 hover:bg-slate-50 hover:text-slate-700'}`}>
              <Icon size={13} />{label}
            </button>
          ))}
        </div>
      </div>

      {/* Sub-tab content */}
      {subTab === 'jurnal'       && <JurnalUmumView  jurnal={allJurnal} akunList={akunList} loading={loadingBB} expenses={expenses} />}
      {subTab === 'buku-besar'   && <BukuBesarView   jurnal={allJurnal} akunList={akunList} loading={loadingBB} />}
      {subTab === 'neraca-saldo' && <NeracaSaldoView  jurnal={allJurnal} akunList={akunList} loading={loadingBB} />}
      {subTab === 'akun'         && <DaftarAkunView   akunList={akunList} loading={loadingBB} />}
    </div>
  );
}

/* ─── JURNAL UMUM VIEW ─── */
function JurnalUmumView({ jurnal, akunList, loading, expenses }: {
  jurnal: JurnalWithDetail[]; akunList: Akun[]; loading: boolean; expenses: Expense[];
}) {
  const [search, setSearch] = useState('');
  const [bulan, setBulan] = useState('semua');
  const mN: Record<string,string> = {'01':'Jan','02':'Feb','03':'Mar','04':'Apr','05':'Mei','06':'Jun','07':'Jul','08':'Agt','09':'Sep','10':'Okt','11':'Nov','12':'Des'};

  const uniqueMonths = [...new Set(jurnal.map(j => j.tanggal.substring(0,7)))].sort((a,b) => b.localeCompare(a));
  const filtered = jurnal.filter(j => {
    const ms = `${j.nomor_jurnal} ${j.keterangan}`.toLowerCase().includes(search.toLowerCase());
    const mb = bulan === 'semua' || j.tanggal.startsWith(bulan);
    return ms && mb;
  });

  const totalDebit  = filtered.reduce((s,j) => s + j.details.filter(d=>d.posisi==='Debit').reduce((a,d) => a+Number(d.nominal),0), 0);
  const totalKredit = filtered.reduce((s,j) => s + j.details.filter(d=>d.posisi==='Kredit').reduce((a,d) => a+Number(d.nominal),0), 0);
  const getAkun = (kode: string) => akunList.find(a => a.kode === kode);

  const exportJurnal = () => {
    const rows = [['Tgl','No. Jurnal','Keterangan','Kode Akun','Nama Akun','Debit','Kredit']];
    filtered.forEach(j => {
      j.details.forEach((d,i) => {
        const akun = getAkun(d.kode_akun);
        rows.push([
          i===0 ? j.tanggal : '',
          i===0 ? j.nomor_jurnal : '',
          i===0 ? j.keterangan : '',
          d.kode_akun,
          akun?.nama ?? d.kode_akun,
          d.posisi==='Debit'  ? String(d.nominal) : '',
          d.posisi==='Kredit' ? String(d.nominal) : '',
        ]);
      });
    });
    const csv = rows.map(r=>r.map(v=>`"${v}"`).join(',')).join('\n');
    const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([csv],{type:'text/csv'})); a.download='jurnal-umum.csv'; a.click();
  };

  return (
    <div className="space-y-4">
      {/* Summary cards */}
      <div className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
          <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Total Entri Jurnal</p>
          <p className="mt-2 text-2xl font-bold text-slate-900">{filtered.length}</p>
          <p className="mt-1 text-xs text-emerald-600">{jurnal.length} jurnal tersedia</p>
        </div>
        <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
          <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Total Debit</p>
          <p className="mt-2 text-2xl font-bold text-slate-900">{rupiah(totalDebit)}</p>
          <p className="mt-1 text-xs text-blue-600">Sisi kiri neraca</p>
        </div>
        <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
          <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Total Kredit</p>
          <p className="mt-2 text-2xl font-bold text-slate-900">{rupiah(totalKredit)}</p>
          <p className={`mt-1 text-xs ${totalDebit===totalKredit?'text-emerald-600':'text-rose-600'}`}>
            {totalDebit===totalKredit ? '✓ Seimbang (Balance)' : '⚠ Tidak seimbang'}
          </p>
        </div>
      </div>

      {/* Filter + tabel */}
      <div className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm">
        <div className="flex flex-wrap items-center gap-3 border-b border-slate-100 bg-slate-50/50 p-4">
          <label className="relative flex-1 min-w-[200px]">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Cari nomor jurnal atau keterangan..." className="form-input pl-9 py-2 text-xs" />
          </label>
          <select value={bulan} onChange={e=>setBulan(e.target.value)} className="form-input w-auto py-2 text-xs">
            <option value="semua">Semua Bulan</option>
            {uniqueMonths.map(ym=>{const[y,m]=ym.split('-');return<option key={ym} value={ym}>{mN[m]} {y}</option>;})}
          </select>
          <button onClick={exportJurnal} className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50">
            <Download size={13}/> Ekspor
          </button>
        </div>

        {loading ? (
          <p className="py-16 text-center text-sm text-slate-400">Memuat jurnal...</p>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-16 text-center">
            <ListOrdered size={40} className="text-slate-200" />
            <p className="text-sm font-medium text-slate-400">Belum ada entri jurnal.</p>
            <p className="text-xs text-slate-400">Jurnal otomatis dibuat dari transaksi yang berstatus Lunas.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[700px] text-xs">
              <thead className="border-b border-slate-100 bg-slate-50/70">
                <tr>
                  <th className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-widest text-slate-400">Tanggal</th>
                  <th className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-widest text-slate-400">No. Jurnal</th>
                  <th className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-widest text-slate-400">Keterangan & Akun</th>
                  <th className="px-4 py-3 text-right text-[10px] font-bold uppercase tracking-widest text-slate-400">Debit (Rp)</th>
                  <th className="px-4 py-3 text-right text-[10px] font-bold uppercase tracking-widest text-slate-400">Kredit (Rp)</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(j => (
                  <React.Fragment key={j.id}>
                    {j.details.map((d, i) => {
                      const akun = getAkun(d.kode_akun);
                      return (
                        <tr key={d.id} className={`border-b border-slate-50 hover:bg-slate-50/60 ${i===0?'':'bg-slate-50/20'}`}>
                          {i===0 && (
                            <td className="px-4 py-2.5 align-top" rowSpan={j.details.length}>
                              <p className="font-medium text-slate-700">{dateText(j.tanggal)}</p>
                              <p className="mt-0.5 text-[10px] text-slate-400">{j.dibuat_oleh}</p>
                            </td>
                          )}
                          {i===0 && (
                            <td className="px-4 py-2.5 align-top" rowSpan={j.details.length}>
                              <p className="font-mono text-xs font-semibold text-slate-700">{j.nomor_jurnal}</p>
                            </td>
                          )}
                          {i===0 && (
                            <td className="px-4 py-2.5" rowSpan={j.details.length}>
                              <p className="font-medium text-slate-800 mb-1">{j.keterangan}</p>
                              {j.details.map((dd,ii) => {
                                const aa = getAkun(dd.kode_akun);
                                return (
                                  <div key={dd.id} className={`flex items-center gap-1.5 text-[10px] ${ii>0?'mt-0.5':''} ${dd.posisi==='Kredit'?'ml-4':''}`}>
                                    <span className={`inline-block w-1.5 h-1.5 rounded-full ${dd.posisi==='Debit'?'bg-blue-400':'bg-orange-400'}`}/>
                                    <span className="font-mono text-slate-500">{dd.kode_akun}</span>
                                    <span className="text-slate-600">{aa?.nama ?? dd.kode_akun}</span>
                                    <span className={`ml-auto text-[10px] font-semibold ${dd.posisi==='Debit'?'text-blue-600':'text-orange-600'}`}>{dd.posisi}</span>
                                  </div>
                                );
                              })}
                            </td>
                          )}
                          <td className="px-4 py-2.5 text-right font-semibold text-blue-700">
                            {d.posisi==='Debit' ? rupiah(Number(d.nominal)) : ''}
                          </td>
                          <td className="px-4 py-2.5 text-right font-semibold text-orange-600">
                            {d.posisi==='Kredit' ? rupiah(Number(d.nominal)) : ''}
                          </td>
                        </tr>
                      );
                    })}
                    <tr className="border-b-2 border-slate-200"><td colSpan={5} /></tr>
                  </React.Fragment>
                ))}
              </tbody>
              <tfoot className="border-t-2 border-slate-200 bg-slate-50">
                <tr>
                  <td colSpan={3} className="px-4 py-3 text-xs font-bold text-slate-600">TOTAL ({filtered.length} jurnal)</td>
                  <td className="px-4 py-3 text-right text-sm font-bold text-blue-700">{rupiah(totalDebit)}</td>
                  <td className="px-4 py-3 text-right text-sm font-bold text-orange-600">{rupiah(totalKredit)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

/* ─── BUKU BESAR VIEW ─── */
function BukuBesarView({ jurnal, akunList, loading }: { jurnal: JurnalWithDetail[]; akunList: Akun[]; loading: boolean; }) {
  const [selectedAkun, setSelectedAkun] = useState<string>('all');

  // Hitung saldo per akun dari semua entri jurnal
  const saldoPerAkun = useMemo(() => {
    const map: Record<string, { debit: number; kredit: number; entries: Array<{ tanggal:string; keterangan:string; nomor:string; debit:number; kredit:number; }> }> = {};
    jurnal.forEach(j => {
      j.details.forEach(d => {
        if (!map[d.kode_akun]) map[d.kode_akun] = { debit:0, kredit:0, entries:[] };
        if (d.posisi==='Debit')  map[d.kode_akun].debit  += Number(d.nominal);
        else                     map[d.kode_akun].kredit += Number(d.nominal);
        map[d.kode_akun].entries.push({
          tanggal: j.tanggal, keterangan: j.keterangan, nomor: j.nomor_jurnal,
          debit:  d.posisi==='Debit'  ? Number(d.nominal) : 0,
          kredit: d.posisi==='Kredit' ? Number(d.nominal) : 0,
        });
      });
    });
    return map;
  }, [jurnal]);

  const akunDenganData = akunList.filter(a => saldoPerAkun[a.kode]);
  const displayAkun = selectedAkun === 'all' ? akunDenganData : akunList.filter(a => a.kode === selectedAkun);

  const jenisColor: Record<JenisAkun,string> = {
    Aset:'bg-blue-50 text-blue-700 border-blue-200',
    Kewajiban:'bg-orange-50 text-orange-700 border-orange-200',
    Ekuitas:'bg-purple-50 text-purple-700 border-purple-200',
    Pendapatan:'bg-emerald-50 text-emerald-700 border-emerald-200',
    Beban:'bg-rose-50 text-rose-700 border-rose-200',
  };

  return (
    <div className="space-y-4">
      {/* Filter akun */}
      <div className="flex flex-wrap items-center gap-3">
        <select value={selectedAkun} onChange={e=>setSelectedAkun(e.target.value)} className="form-input w-auto">
          <option value="all">Semua Akun ({akunDenganData.length} akun aktif)</option>
          {(['Aset','Kewajiban','Ekuitas','Pendapatan','Beban'] as JenisAkun[]).map(jenis => (
            <optgroup key={jenis} label={`─── ${jenis} ───`}>
              {akunList.filter(a=>a.jenis===jenis && saldoPerAkun[a.kode]).map(a=>(
                <option key={a.kode} value={a.kode}>{a.kode} — {a.nama}</option>
              ))}
            </optgroup>
          ))}
        </select>
        <span className="text-xs text-slate-500">{loading ? 'Memuat...' : `${akunDenganData.length} akun memiliki transaksi`}</span>
      </div>

      {loading ? <p className="py-16 text-center text-sm text-slate-400">Memuat buku besar...</p> :
      displayAkun.length === 0 ? (
        <div className="rounded-2xl border border-slate-100 bg-white p-16 text-center shadow-sm">
          <BookMarked size={40} className="mx-auto mb-3 text-slate-200" />
          <p className="text-sm text-slate-400">Belum ada transaksi pada akun ini.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {displayAkun.map(akun => {
            const data = saldoPerAkun[akun.kode];
            if (!data) return null;
            const saldo = akun.saldo_normal === 'Debit' ? data.debit - data.kredit : data.kredit - data.debit;
            let runSaldo = 0;
            return (
              <div key={akun.kode} className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm">
                {/* Akun header */}
                <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50/60 px-5 py-3.5">
                  <div className="flex items-center gap-3">
                    <span className="font-mono text-sm font-bold text-slate-700">{akun.kode}</span>
                    <span className="text-sm font-semibold text-slate-900">{akun.nama}</span>
                    <span className={`rounded-full border px-2 py-0.5 text-[10px] font-bold ${jenisColor[akun.jenis]}`}>{akun.jenis}</span>
                  </div>
                  <div className="flex items-center gap-4 text-xs">
                    <span className="text-slate-500">Saldo Normal: <b className="text-slate-700">{akun.saldo_normal}</b></span>
                    <span className={`font-bold text-sm ${saldo >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>{rupiah(Math.abs(saldo))}</span>
                  </div>
                </div>
                {/* T-Account tabel */}
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[600px] text-xs">
                    <thead className="border-b border-slate-100">
                      <tr>
                        <th className="px-4 py-2.5 text-left text-[10px] font-bold uppercase tracking-widest text-slate-400">Tanggal</th>
                        <th className="px-4 py-2.5 text-left text-[10px] font-bold uppercase tracking-widest text-slate-400">Keterangan</th>
                        <th className="px-4 py-2.5 text-left text-[10px] font-bold uppercase tracking-widest text-slate-400">Ref</th>
                        <th className="px-4 py-2.5 text-right text-[10px] font-bold uppercase tracking-widest text-blue-400">Debit</th>
                        <th className="px-4 py-2.5 text-right text-[10px] font-bold uppercase tracking-widest text-orange-400">Kredit</th>
                        <th className="px-4 py-2.5 text-right text-[10px] font-bold uppercase tracking-widest text-slate-400">Saldo</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      <tr className="bg-emerald-50/40">
                        <td className="px-4 py-2 text-xs text-slate-500" colSpan={3}><b>Saldo Awal</b></td>
                        <td className="px-4 py-2 text-right text-xs text-slate-400">—</td>
                        <td className="px-4 py-2 text-right text-xs text-slate-400">—</td>
                        <td className="px-4 py-2 text-right text-xs font-semibold text-slate-600">Rp 0</td>
                      </tr>
                      {[...data.entries].sort((a,b)=>a.tanggal.localeCompare(b.tanggal)).map((e,i) => {
                        if (akun.saldo_normal==='Debit') runSaldo += e.debit - e.kredit;
                        else runSaldo += e.kredit - e.debit;
                        return (
                          <tr key={i} className="hover:bg-slate-50/60">
                            <td className="px-4 py-2.5 text-slate-600">{dateText(e.tanggal)}</td>
                            <td className="px-4 py-2.5 text-slate-700 max-w-[200px] truncate">{e.keterangan}</td>
                            <td className="px-4 py-2.5 font-mono text-slate-500">{e.nomor}</td>
                            <td className="px-4 py-2.5 text-right font-semibold text-blue-600">{e.debit>0?rupiah(e.debit):''}</td>
                            <td className="px-4 py-2.5 text-right font-semibold text-orange-500">{e.kredit>0?rupiah(e.kredit):''}</td>
                            <td className={`px-4 py-2.5 text-right font-bold ${runSaldo>=0?'text-slate-800':'text-rose-600'}`}>{rupiah(Math.abs(runSaldo))}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                    <tfoot className="border-t-2 border-slate-200 bg-slate-50">
                      <tr>
                        <td colSpan={3} className="px-4 py-3 text-xs font-bold text-slate-600">TOTAL</td>
                        <td className="px-4 py-3 text-right text-sm font-bold text-blue-700">{rupiah(data.debit)}</td>
                        <td className="px-4 py-3 text-right text-sm font-bold text-orange-600">{rupiah(data.kredit)}</td>
                        <td className={`px-4 py-3 text-right text-sm font-bold ${saldo>=0?'text-emerald-700':'text-rose-600'}`}>{rupiah(Math.abs(saldo))}</td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* ─── NERACA SALDO VIEW ─── */
function NeracaSaldoView({ jurnal, akunList, loading }: { jurnal: JurnalWithDetail[]; akunList: Akun[]; loading: boolean; }) {
  // Hitung saldo per akun
  const saldoMap = useMemo(() => {
    const m: Record<string,{debit:number;kredit:number}> = {};
    jurnal.forEach(j => j.details.forEach(d => {
      if (!m[d.kode_akun]) m[d.kode_akun] = {debit:0,kredit:0};
      if (d.posisi==='Debit') m[d.kode_akun].debit  += Number(d.nominal);
      else                    m[d.kode_akun].kredit += Number(d.nominal);
    }));
    return m;
  }, [jurnal]);

  const rows = akunList.filter(a => saldoMap[a.kode]).map(akun => {
    const s = saldoMap[akun.kode];
    const saldo = akun.saldo_normal==='Debit' ? s.debit - s.kredit : s.kredit - s.debit;
    return {
      ...akun,
      totalDebit:  s.debit,
      totalKredit: s.kredit,
      saldoDebit:  akun.saldo_normal==='Debit'  ? Math.max(saldo,0)  : Math.max(-saldo,0),
      saldoKredit: akun.saldo_normal==='Kredit' ? Math.max(saldo,0)  : Math.max(-saldo,0),
    };
  });

  const totalSaldoDebit  = rows.reduce((s,r) => s+r.saldoDebit, 0);
  const totalSaldoKredit = rows.reduce((s,r) => s+r.saldoKredit, 0);
  const isBalance = totalSaldoDebit === totalSaldoKredit;

  const jenisOrder: JenisAkun[] = ['Aset','Kewajiban','Ekuitas','Pendapatan','Beban'];

  const exportNeraca = () => {
    const csv = [['Kode','Nama Akun','Jenis','Total Debit','Total Kredit','Saldo Debit','Saldo Kredit'],
      ...rows.map(r=>[r.kode,r.nama,r.jenis,String(r.totalDebit),String(r.totalKredit),String(r.saldoDebit),String(r.saldoKredit)])
    ].map(r=>r.map(v=>`"${v}"`).join(',')).join('\n');
    const a=document.createElement('a'); a.href=URL.createObjectURL(new Blob([csv],{type:'text/csv'})); a.download='neraca-saldo.csv'; a.click();
  };

  return (
    <div className="space-y-4">
      {/* Status balance */}
      <div className={`flex items-center gap-3 rounded-2xl border p-4 ${isBalance?'border-emerald-200 bg-emerald-50':'border-rose-200 bg-rose-50'}`}>
        <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${isBalance?'bg-emerald-500':'bg-rose-500'} text-white`}>
          <Scale size={18}/>
        </div>
        <div>
          <p className={`text-sm font-bold ${isBalance?'text-emerald-800':'text-rose-800'}`}>
            {isBalance ? '✓ Neraca Seimbang (Balance)' : '⚠ Neraca Tidak Seimbang'}
          </p>
          <p className={`text-xs ${isBalance?'text-emerald-600':'text-rose-600'}`}>
            Total Debit {rupiah(totalSaldoDebit)} — Total Kredit {rupiah(totalSaldoKredit)}
            {!isBalance && ` — Selisih: ${rupiah(Math.abs(totalSaldoDebit-totalSaldoKredit))}`}
          </p>
        </div>
        <button onClick={exportNeraca} className="ml-auto flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50 shadow-sm">
          <Download size={13}/> Ekspor
        </button>
      </div>

      {loading ? <p className="py-16 text-center text-sm text-slate-400">Memuat neraca saldo...</p> : (
        <div className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[700px] text-xs">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/70">
                  <th className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-widest text-slate-400">Kode</th>
                  <th className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-widest text-slate-400">Nama Akun</th>
                  <th className="px-4 py-3 text-right text-[10px] font-bold uppercase tracking-widest text-blue-400">Debit (Rp)</th>
                  <th className="px-4 py-3 text-right text-[10px] font-bold uppercase tracking-widest text-orange-400">Kredit (Rp)</th>
                  <th className="px-4 py-3 text-right text-[10px] font-bold uppercase tracking-widest text-blue-600">Saldo Debit</th>
                  <th className="px-4 py-3 text-right text-[10px] font-bold uppercase tracking-widest text-orange-600">Saldo Kredit</th>
                </tr>
              </thead>
              <tbody>
                {jenisOrder.map(jenis => {
                  const rowsByJenis = rows.filter(r=>r.jenis===jenis);
                  if (!rowsByJenis.length) return null;
                  const subTotalD = rowsByJenis.reduce((s,r)=>s+r.saldoDebit,0);
                  const subTotalK = rowsByJenis.reduce((s,r)=>s+r.saldoKredit,0);
                  return (
                    <React.Fragment key={jenis}>
                      <tr className="bg-slate-100/60">
                        <td colSpan={6} className="px-4 py-2 text-[10px] font-bold uppercase tracking-widest text-slate-500">{jenis}</td>
                      </tr>
                      {rowsByJenis.map(row => (
                        <tr key={row.kode} className="border-b border-slate-50 hover:bg-slate-50/60">
                          <td className="px-4 py-2.5 font-mono text-slate-600">{row.kode}</td>
                          <td className="px-4 py-2.5 font-medium text-slate-800">{row.nama}</td>
                          <td className="px-4 py-2.5 text-right text-blue-600">{rupiah(row.totalDebit)}</td>
                          <td className="px-4 py-2.5 text-right text-orange-500">{rupiah(row.totalKredit)}</td>
                          <td className="px-4 py-2.5 text-right font-semibold text-blue-700">{row.saldoDebit>0?rupiah(row.saldoDebit):''}</td>
                          <td className="px-4 py-2.5 text-right font-semibold text-orange-600">{row.saldoKredit>0?rupiah(row.saldoKredit):''}</td>
                        </tr>
                      ))}
                      <tr className="border-b-2 border-slate-200 bg-slate-50">
                        <td colSpan={4} className="px-4 py-2 text-[10px] font-bold text-slate-500">Sub-total {jenis}</td>
                        <td className="px-4 py-2 text-right text-xs font-bold text-blue-700">{subTotalD>0?rupiah(subTotalD):''}</td>
                        <td className="px-4 py-2 text-right text-xs font-bold text-orange-600">{subTotalK>0?rupiah(subTotalK):''}</td>
                      </tr>
                    </React.Fragment>
                  );
                })}
              </tbody>
              <tfoot className="border-t-2 border-slate-900/20 bg-slate-100">
                <tr>
                  <td colSpan={4} className="px-4 py-3.5 text-sm font-bold text-slate-700">GRAND TOTAL</td>
                  <td className={`px-4 py-3.5 text-right text-sm font-bold ${isBalance?'text-blue-700':'text-rose-600'}`}>{rupiah(totalSaldoDebit)}</td>
                  <td className={`px-4 py-3.5 text-right text-sm font-bold ${isBalance?'text-orange-600':'text-rose-600'}`}>{rupiah(totalSaldoKredit)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

/* ─── DAFTAR AKUN VIEW ─── */
function DaftarAkunView({ akunList, loading }: { akunList: Akun[]; loading: boolean; }) {
  const jenisOrder: JenisAkun[] = ['Aset','Kewajiban','Ekuitas','Pendapatan','Beban'];
  const jenisColor: Record<JenisAkun,string> = {
    Aset:'bg-blue-50 text-blue-700 border-blue-200',
    Kewajiban:'bg-orange-50 text-orange-700 border-orange-200',
    Ekuitas:'bg-purple-50 text-purple-700 border-purple-200',
    Pendapatan:'bg-emerald-50 text-emerald-700 border-emerald-200',
    Beban:'bg-rose-50 text-rose-700 border-rose-200',
  };

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-5">
        {jenisOrder.map(j => (
          <div key={j} className={`rounded-2xl border p-4 ${jenisColor[j].replace('text-','border-').replace('bg-','border-')} bg-white shadow-sm`}>
            <p className={`text-[10px] font-bold uppercase tracking-widest ${jenisColor[j].split(' ')[1]}`}>{j}</p>
            <p className="mt-1.5 text-xl font-bold text-slate-900">{akunList.filter(a=>a.jenis===j).length}</p>
            <p className="text-xs text-slate-400">Akun</p>
          </div>
        ))}
      </div>

      {loading ? <p className="py-16 text-center text-sm text-slate-400">Memuat daftar akun...</p> : (
        <div className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[600px] text-xs">
              <thead className="border-b border-slate-100 bg-slate-50/70">
                <tr>
                  <th className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-widest text-slate-400">Kode</th>
                  <th className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-widest text-slate-400">Nama Akun</th>
                  <th className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-widest text-slate-400">Jenis</th>
                  <th className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-widest text-slate-400">Sub Jenis</th>
                  <th className="px-4 py-3 text-center text-[10px] font-bold uppercase tracking-widest text-slate-400">Saldo Normal</th>
                </tr>
              </thead>
              <tbody>
                {jenisOrder.map(jenis => {
                  const byJenis = akunList.filter(a=>a.jenis===jenis);
                  if (!byJenis.length) return null;
                  return (
                    <React.Fragment key={jenis}>
                      <tr className="bg-slate-100/60">
                        <td colSpan={5} className="px-4 py-2 text-[10px] font-bold uppercase tracking-widest text-slate-500">{jenis}</td>
                      </tr>
                      {byJenis.map(akun => (
                        <tr key={akun.kode} className="border-b border-slate-50 hover:bg-slate-50/60">
                          <td className="px-4 py-3 font-mono font-semibold text-slate-700">{akun.kode}</td>
                          <td className="px-4 py-3 font-medium text-slate-800">{akun.nama}</td>
                          <td className="px-4 py-3"><span className={`inline-block rounded-full border px-2 py-0.5 text-[10px] font-bold ${jenisColor[akun.jenis]}`}>{akun.jenis}</span></td>
                          <td className="px-4 py-3 text-slate-500">{akun.sub_jenis}</td>
                          <td className="px-4 py-3 text-center">
                            <span className={`inline-block rounded-full px-2 py-0.5 text-[10px] font-bold ${akun.saldo_normal==='Debit'?'bg-blue-50 text-blue-600':'bg-orange-50 text-orange-600'}`}>{akun.saldo_normal}</span>
                          </td>
                        </tr>
                      ))}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
