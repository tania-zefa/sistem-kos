import { FormEvent, useCallback, useEffect, useMemo, useState } from 'react';
import {
  ArrowUpRight, BarChart3, Building2, Check, CheckCircle2, ChevronDown, ChevronRight,
  CircleDollarSign, Clock, CreditCard, Download, Edit3, FileBarChart, FileText,
  Home, Hotel, LayoutDashboard, MapPin, Plus, Printer, Receipt, Search,
  Settings2, ShieldCheck, Sparkles, Tags, Trash2, TrendingUp, Users, Wallet,
  Wifi, X, Zap,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';

/* ─── TYPES ─── */
type Category     = 'Listrik' | 'Air' | 'Internet/WiFi' | 'Kebersihan' | 'Perawatan & Perbaikan' | 'Gaji Karyawan' | 'Perlengkapan Kos' | 'Biaya Lainnya';
type PaymentStatus = 'Lunas' | 'Belum Lunas' | 'Sebagian';
type PaymentMethod = 'Kas Tunai (Petty Cash)' | 'Transfer Bank' | 'QRIS' | 'Kartu Debit' | 'Lainnya';
type Tab          = 'dashboard' | 'transaksi' | 'laporan' | 'kategori' | 'pengaturan';

type Expense = {
  id: string; transaction_date: string; transaction_number: string;
  description: string; category: Category; amount: number;
  status: PaymentStatus; payment_method: PaymentMethod;
  unit_kamar: string; vendor: string; created_at: string;
};
type FormState = {
  transaction_date: string; transaction_number: string; description: string;
  category: Category; amount: string; status: PaymentStatus;
  payment_method: PaymentMethod; unit_kamar: string; vendor: string;
};

/* ─── CONSTANTS ─── */
const categories: Category[]     = ['Listrik','Air','Internet/WiFi','Kebersihan','Perawatan & Perbaikan','Gaji Karyawan','Perlengkapan Kos','Biaya Lainnya'];
const paymentMethods: PaymentMethod[] = ['Kas Tunai (Petty Cash)','Transfer Bank','QRIS','Kartu Debit','Lainnya'];
const unitOptions = ['Semua Kamar','Lantai 1','Lantai 2','Lantai 3','Kamar 101','Kamar 102','Kamar 103','Kamar 201','Kamar 202','Kamar 203','Kamar 204','Kamar 205','Kamar 301','Kamar 302','Kamar 303','Area Umum','Dapur','Parkir','Lainnya'];

const categoryMeta: Record<Category, { color: string; dot: string }> = {
  'Listrik':               { color: 'bg-amber-50 text-amber-700 border-amber-200/80',   dot: 'bg-amber-400' },
  'Air':                   { color: 'bg-sky-50 text-sky-700 border-sky-200/80',         dot: 'bg-sky-400' },
  'Internet/WiFi':         { color: 'bg-indigo-50 text-indigo-700 border-indigo-200/80',dot: 'bg-indigo-400' },
  'Kebersihan':            { color: 'bg-emerald-50 text-emerald-700 border-emerald-200/80', dot: 'bg-emerald-400' },
  'Perawatan & Perbaikan': { color: 'bg-orange-50 text-orange-700 border-orange-200/80',dot: 'bg-orange-400' },
  'Gaji Karyawan':         { color: 'bg-teal-50 text-teal-700 border-teal-200/80',      dot: 'bg-teal-400' },
  'Perlengkapan Kos':      { color: 'bg-rose-50 text-rose-700 border-rose-200/80',      dot: 'bg-rose-400' },
  'Biaya Lainnya':         { color: 'bg-slate-100 text-slate-600 border-slate-200/80',  dot: 'bg-slate-400' },
};

const statusMeta: Record<PaymentStatus, { bg: string; text: string; border: string; icon: typeof Check; label: string }> = {
  'Lunas':       { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200', icon: Check,  label: 'Lunas' },
  'Belum Lunas': { bg: 'bg-red-50',     text: 'text-red-600',     border: 'border-red-200',    icon: Clock,  label: 'Belum Lunas' },
  'Sebagian':    { bg: 'bg-amber-50',   text: 'text-amber-700',   border: 'border-amber-200',  icon: Clock,  label: 'Sebagian' },
};

const methodMeta: Record<PaymentMethod, { bg: string; text: string }> = {
  'Kas Tunai (Petty Cash)': { bg: 'bg-slate-100',   text: 'text-slate-600' },
  'Transfer Bank':           { bg: 'bg-blue-50',     text: 'text-blue-600' },
  'QRIS':                    { bg: 'bg-purple-50',   text: 'text-purple-600' },
  'Kartu Debit':             { bg: 'bg-teal-50',     text: 'text-teal-600' },
  'Lainnya':                 { bg: 'bg-slate-100',   text: 'text-slate-500' },
};

// Safe accessor untuk methodMeta — handle nilai lama dari DB
function getMethodMeta(pm: string | null | undefined) {
  const key = pm as PaymentMethod;
  return methodMeta[key] ?? methodMeta['Kas Tunai (Petty Cash)'];
}

// Safe accessor untuk categoryMeta
function getCategoryMeta(cat: string | null | undefined) {
  const key = cat as Category;
  return categoryMeta[key] ?? categoryMeta['Biaya Lainnya'];
}

// Safe accessor untuk statusMeta
function getStatusMeta(st: string | null | undefined) {
  const key = (st ?? 'Lunas') as PaymentStatus;
  return statusMeta[key] ?? statusMeta['Lunas'];
}

const propertyPhotos = [
  { url: 'https://images.pexels.com/photos/6487950/pexels-photo-6487950.jpeg?auto=compress&cs=tinysrgb&h=650&w=940', label: 'Kamar',  title: 'Kamar Single Cozy & Terang' },
  { url: 'https://images.pexels.com/photos/33389378/pexels-photo-33389378.jpeg?auto=compress&cs=tinysrgb&h=650&w=940', label: 'Pantry', title: 'Dapur Komunal Bersih' },
  { url: 'https://images.pexels.com/photos/15143517/pexels-photo-15143517.jpeg?auto=compress&cs=tinysrgb&h=650&w=940', label: 'Parkir', title: 'Area Parkir Aman & Beratap' },
];

/* ─── HELPERS ─── */
const rupiah = (n: number) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(n);
const rupiahShort = (n: number) => {
  if (n >= 1_000_000) return `Rp ${(n / 1_000_000).toFixed(1)}jt`;
  if (n >= 1_000)     return `Rp ${(n / 1_000).toFixed(0)}rb`;
  return `Rp ${n}`;
};
const dateText = (d: string) => new Intl.DateTimeFormat('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(`${d}T00:00:00`));

function makeBkk(date: string, count: number) {
  return `BKK-${date.replace(/-/g,'').substring(2)}-${String(count+1).padStart(3,'0')}`;
}
const today = new Date().toISOString().split('T')[0];

function newForm(count: number): FormState {
  return { transaction_date: today, transaction_number: makeBkk(today, count), description: '', category: 'Listrik', amount: '', status: 'Lunas', payment_method: 'Kas Tunai (Petty Cash)', unit_kamar: 'Semua Kamar', vendor: '' };
}

/* ════════════════════════════════════════════════
   APP
════════════════════════════════════════════════ */
function App() {
  const [tab, setTab]             = useState<Tab>('dashboard');
  const [expenses, setExpenses]   = useState<Expense[]>([]);
  const [loading, setLoading]     = useState(true);
  const [photo, setPhoto]         = useState(0);
  const [notice, setNotice]       = useState<{ msg: string; type: 'success' | 'error' } | null>(null);
  const [modal, setModal]         = useState<'add' | 'edit' | null>(null);
  const [editing, setEditing]     = useState<Expense | null>(null);
  const [removeTarget, setRemoveTarget] = useState<Expense | null>(null);
  const [query, setQuery]         = useState('');
  const [categoryFilter, setCategoryFilter] = useState<'Semua Kategori' | Category>('Semua Kategori');
  const [statusFilter, setStatusFilter]     = useState<'Semua Status' | PaymentStatus>('Semua Status');
  const [form, setForm]           = useState<FormState>(newForm(0));
  const [dateFilter, setDateFilter]   = useState('semua');
  const [periodMode, setPeriodMode]   = useState<'semua' | 'bulan' | 'tahun'>('semua');
  const [profile, setProfile]     = useState({ business_name: 'Harmoni Residence Kost Putri', business_address: 'Jl. Cempaka Raya No. 18, Tembalang, Kota Semarang', manager_name: 'Andi Setiawan' });

  const notify = useCallback((msg: string, type: 'success'|'error' = 'success') => {
    setNotice({ msg, type }); window.setTimeout(() => setNotice(null), 3000);
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase.from('cash_expenses').select('*').order('transaction_date', { ascending: false });
    if (error) { notify('Gagal memuat data.', 'error'); setLoading(false); return; }
    setExpenses((data ?? []) as Expense[]);
    setLoading(false);
  }, [notify]);

  useEffect(() => { void load(); }, [load]);
  useEffect(() => {
    void (async () => {
      const { data } = await supabase.from('property_settings').select('business_name,business_address,manager_name').eq('id',1).maybeSingle();
      if (data) { setProfile(data); return; }
      await supabase.from('property_settings').insert({ id: 1 });
      const { data: f } = await supabase.from('property_settings').select('business_name,business_address,manager_name').eq('id',1).maybeSingle();
      if (f) setProfile(f);
    })();
  }, []);

  const total      = expenses.reduce((s,e) => s+Number(e.amount), 0);
  const totalLunas = expenses.filter(e => (e.status??'Lunas')==='Lunas').reduce((s,e) => s+Number(e.amount), 0);
  const totalBelum = expenses.filter(e => (e.status??'Lunas')!=='Lunas').reduce((s,e) => s+Number(e.amount), 0);
  const utilities  = expenses.filter(e => ['Listrik','Air','Internet/WiFi'].includes(e.category)).reduce((s,e) => s+Number(e.amount), 0);
  const unpaidList = expenses.filter(e => (e.status??'Lunas')!=='Lunas');
  const ratio      = total ? Math.round((totalLunas/total)*100) : 100;

  const filtered = useMemo(() => expenses.filter(item => {
    const q = query.toLowerCase();
    const ms = `${item.transaction_number} ${item.description} ${item.category} ${item.vendor??''} ${item.unit_kamar??''}`.toLowerCase().includes(q);
    const mc = categoryFilter==='Semua Kategori' || item.category===categoryFilter;
    const mst = statusFilter==='Semua Status' || (item.status??'Lunas')===statusFilter;
    let md = true;
    if (periodMode==='bulan' && dateFilter!=='semua') md = item.transaction_date.startsWith(dateFilter);
    else if (periodMode==='tahun' && dateFilter!=='semua') md = item.transaction_date.startsWith(dateFilter);
    return ms && mc && mst && md;
  }), [expenses, query, categoryFilter, statusFilter, dateFilter, periodMode]);

  const categoryTotals = categories
    .map(cat => ({ category: cat, amount: expenses.filter(e=>e.category===cat).reduce((s,e)=>s+Number(e.amount),0) }))
    .filter(e => e.amount>0).sort((a,b) => b.amount-a.amount);

  const openAdd  = () => { setEditing(null); setForm(newForm(expenses.length)); setModal('add'); };
  const openEdit = (item: Expense) => {
    setEditing(item);
    setForm({ transaction_date: item.transaction_date, transaction_number: item.transaction_number, description: item.description, category: item.category, amount: String(item.amount), status: item.status??'Lunas', payment_method: (item.payment_method as PaymentMethod)??'Kas Tunai (Petty Cash)', unit_kamar: item.unit_kamar??'Semua Kamar', vendor: item.vendor??'' });
    setModal('edit');
  };

  const save = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const { status, payment_method, unit_kamar, vendor, ...core } = form;
    const cp = { ...core, amount: Number(form.amount) };
    const fp = { ...cp, status, payment_method, unit_kamar, vendor };
    if (!cp.description || !cp.transaction_number || !cp.amount) { notify('Lengkapi semua data wajib.','error'); return; }
    let res = editing
      ? await supabase.from('cash_expenses').update(fp).eq('id',editing.id).select('*').maybeSingle()
      : await supabase.from('cash_expenses').insert(fp).select('*').maybeSingle();
    if (res.error) res = editing
      ? await supabase.from('cash_expenses').update({...cp,status,payment_method}).eq('id',editing.id).select('*').maybeSingle()
      : await supabase.from('cash_expenses').insert({...cp,status,payment_method}).select('*').maybeSingle();
    if (res.error||!res.data) { notify('Gagal menyimpan: '+(res.error?.message??''), 'error'); return; }
    setExpenses(items => editing ? items.map(i=>i.id===editing.id?(res.data as Expense):i) : [res.data as Expense,...items]);
    setModal(null);
    notify(editing ? 'Transaksi berhasil diperbarui.' : 'Transaksi berhasil dicatat.');
  };

  const lunaskan = async (item: Expense) => {
    const { error } = await supabase.from('cash_expenses').update({ status:'Lunas' }).eq('id',item.id);
    if (error) { notify('Gagal melunaskan.','error'); return; }
    setExpenses(items => items.map(i => i.id===item.id ? {...i, status:'Lunas'} : i));
    notify(`✓ ${item.transaction_number} berhasil dilunaskan.`);
  };

  const remove = async () => {
    if (!removeTarget) return;
    const { error } = await supabase.from('cash_expenses').delete().eq('id',removeTarget.id);
    if (error) { notify('Gagal menghapus.','error'); return; }
    setExpenses(items => items.filter(i=>i.id!==removeTarget.id));
    setRemoveTarget(null);
    notify('Transaksi berhasil dihapus.');
  };

  const exportCsv = () => {
    const csv = [['Tanggal','No. BKK','Uraian','Kategori','Unit','Vendor','Nominal','Metode','Status'],
      ...filtered.map(e=>[e.transaction_date,e.transaction_number,e.description,e.category,e.unit_kamar??'',e.vendor??'',String(e.amount),e.payment_method??'',e.status??'Lunas'])
    ].map(row=>row.map(v=>`"${v.replace(/"/g,'""')}"`).join(',')).join('\n');
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([csv],{type:'text/csv'}));
    a.download = 'laporan-kas-keluar.csv'; a.click();
    notify('Laporan berhasil diekspor.');
  };

  const saveProfile = async (next: typeof profile) => {
    const { error } = await supabase.from('property_settings').update({...next, updated_at: new Date().toISOString()}).eq('id',1);
    if (error) { notify('Gagal menyimpan profil.','error'); return; }
    setProfile(next); notify('Profil berhasil disimpan.');
  };

  const navTabs: { id: Tab; label: string; short: string; icon: typeof LayoutDashboard }[] = [
    { id:'dashboard',  label:'Dashboard',        short:'Dashboard',  icon:LayoutDashboard },
    { id:'transaksi',  label:'Buku Transaksi',   short:'Transaksi',  icon:Receipt },
    { id:'laporan',    label:'Laporan',           short:'Laporan',    icon:FileBarChart },
    { id:'kategori',   label:'Kategori',          short:'Kategori',   icon:Tags },
    { id:'pengaturan', label:'Pengaturan',        short:'Pengaturan', icon:Settings2 },
  ];

  return (
    <div className="min-h-screen bg-[#f8fafc]">
      {/* ── HEADER ── */}
      <header className="sticky top-0 z-40 border-b border-slate-200/60 bg-white/90 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-screen-2xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
          {/* Logo */}
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-700 text-white shadow-md shadow-emerald-500/30">
              <Hotel size={18} strokeWidth={2} />
            </div>
            <div className="hidden sm:block">
              <p className="text-sm font-bold tracking-tight text-slate-900">Harmoni Residence</p>
              <p className="text-[10px] font-medium text-slate-400 leading-none mt-0.5">Sistem Akuntansi Kas Keluar</p>
            </div>
          </div>

          {/* Nav desktop */}
          <nav className="hidden items-center gap-1 lg:flex">
            {navTabs.map(({ id, label, icon: Icon }) => (
              <button key={id} onClick={() => setTab(id)}
                className={`flex items-center gap-2 rounded-xl px-3.5 py-2 text-xs font-medium transition-all ${tab===id ? 'bg-emerald-50 text-emerald-700 font-semibold' : 'text-slate-500 hover:bg-slate-100 hover:text-slate-700'}`}>
                <Icon size={14} strokeWidth={tab===id ? 2.5 : 2} />{label}
              </button>
            ))}
          </nav>

          {/* CTA */}
          <button onClick={openAdd} className="btn-primary shadow-emerald-500/20">
            <Plus size={15} strokeWidth={2.5} />
            <span className="hidden sm:inline">Catat Pengeluaran</span>
          </button>
        </div>

        {/* Nav mobile */}
        <nav className="flex border-t border-slate-100 px-2 pb-1.5 pt-1 lg:hidden overflow-x-auto gap-0.5">
          {navTabs.map(({ id, short, icon: Icon }) => (
            <button key={id} onClick={() => setTab(id)}
              className={`flex flex-1 min-w-fit flex-col items-center gap-0.5 rounded-lg px-3 py-1.5 text-[10px] font-medium transition-all ${tab===id ? 'text-emerald-700 font-semibold' : 'text-slate-400'}`}>
              <Icon size={16} strokeWidth={tab===id ? 2.5 : 1.8} />{short}
            </button>
          ))}
        </nav>
      </header>

      {/* ── MAIN ── */}
      <main className="mx-auto max-w-screen-2xl space-y-6 px-4 py-6 sm:px-6 lg:px-8 animate-fade-in">
        {tab==='dashboard'  && <Dashboard expenses={expenses} total={total} totalLunas={totalLunas} totalBelum={totalBelum} utilities={utilities} unpaidList={unpaidList} ratio={ratio} categoryTotals={categoryTotals} loading={loading} photo={photo} setPhoto={setPhoto} openAdd={openAdd} setTab={setTab} openEdit={openEdit} setRemoveTarget={setRemoveTarget} onLunaskan={lunaskan} />}
        {tab==='transaksi'  && <Transactions expenses={filtered} allExpenses={expenses} query={query} setQuery={setQuery} categoryFilter={categoryFilter} setCategoryFilter={setCategoryFilter} statusFilter={statusFilter} setStatusFilter={setStatusFilter} dateFilter={dateFilter} setDateFilter={setDateFilter} periodMode={periodMode} setPeriodMode={setPeriodMode} openAdd={openAdd} openEdit={openEdit} setRemoveTarget={setRemoveTarget} exportCsv={exportCsv} loading={loading} onLunaskan={lunaskan} />}
        {tab==='laporan'    && <Reports expenses={expenses} categoryTotals={categoryTotals} exportCsv={exportCsv} />}
        {tab==='kategori'   && <Categories categoryTotals={categoryTotals} total={total} />}
        {tab==='pengaturan' && <SettingsPage profile={profile} onSave={saveProfile} />}
      </main>

      {/* ── TOAST ── */}
      {notice && (
        <div className={`fixed bottom-6 right-6 z-50 flex items-center gap-3 rounded-2xl px-5 py-3.5 text-sm font-medium shadow-2xl animate-slide-up ${notice.type==='error' ? 'bg-red-600 text-white' : 'bg-slate-900 text-white'}`}>
          {notice.type==='error' ? <X size={16} className="text-red-200" /> : <CheckCircle2 size={16} className="text-emerald-400" />}
          {notice.msg}
        </div>
      )}

      {modal        && <ExpenseModal mode={modal} form={form} setForm={setForm} onClose={()=>setModal(null)} onSubmit={save} expenseCount={expenses.length} />}
      {removeTarget && <ConfirmDelete item={removeTarget} onClose={()=>setRemoveTarget(null)} onConfirm={()=>void remove()} />}
    </div>
  );
}

/* ════════════════════════════════════════════════
   DASHBOARD
════════════════════════════════════════════════ */
function Dashboard({ expenses, total, totalLunas, totalBelum, utilities, unpaidList, ratio, categoryTotals, loading, photo, setPhoto, openAdd, setTab, openEdit, setRemoveTarget, onLunaskan }: {
  expenses:Expense[]; total:number; totalLunas:number; totalBelum:number; utilities:number;
  unpaidList:Expense[]; ratio:number; categoryTotals:{category:Category;amount:number}[];
  loading:boolean; photo:number; setPhoto:(v:number)=>void; openAdd:()=>void;
  setTab:(t:Tab)=>void; openEdit:(e:Expense)=>void; setRemoveTarget:(e:Expense)=>void; onLunaskan:(e:Expense)=>void;
}) {
  return (
    <div className="space-y-6">
      {/* ── HERO ── */}
      <div className="overflow-hidden rounded-3xl border border-slate-100 bg-white shadow-md">
        <div className="grid lg:grid-cols-5">
          {/* Left info */}
          <div className="flex flex-col justify-between gap-6 p-7 lg:col-span-3">
            <div>
              <div className="mb-4 flex flex-wrap gap-2">
                <span className="badge bg-rose-50 text-rose-600 border border-rose-100">Kost Putri Eksklusif</span>
                <span className="badge bg-emerald-50 text-emerald-700 border border-emerald-100">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />Okupansi: 21 / 24 Kamar
                </span>
              </div>
              <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">Harmoni Residence<br /><span className="text-emerald-600">Kost Putri</span></h1>
              <p className="mt-3 flex items-center gap-1.5 text-sm text-slate-400">
                <MapPin size={13} className="shrink-0 text-rose-400" />Jl. Cempaka Raya No. 18, Tembalang, Kota Semarang
              </p>
            </div>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {[{icon:Wifi,label:'Wi-Fi 100Mbps',bg:'bg-emerald-100',tc:'text-emerald-600'},{icon:Building2,label:'AC & Heater',bg:'bg-sky-100',tc:'text-sky-600'},{icon:ShieldCheck,label:'CCTV 24 Jam',bg:'bg-rose-100',tc:'text-rose-600'},{icon:Settings2,label:'Smart Lock',bg:'bg-amber-100',tc:'text-amber-600'}].map(({icon:Icon,label,bg,tc}) => (
                <div key={label} className="flex items-center gap-2 rounded-xl border border-slate-100 bg-slate-50 p-2.5">
                  <div className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ${bg} ${tc}`}><Icon size={13} /></div>
                  <span className="text-[10px] font-medium text-slate-600 leading-tight">{label}</span>
                </div>
              ))}
            </div>
            <div className="flex flex-wrap gap-2">
              <button onClick={openAdd} className="btn-primary"><Plus size={14} /> Catat Pengeluaran</button>
              <button onClick={() => setTab('laporan')} className="btn-secondary"><FileText size={14} className="text-emerald-600" /> Lihat Laporan</button>
            </div>
          </div>

          {/* Photo gallery */}
          <div className="border-t border-slate-100 bg-slate-50/60 p-5 lg:col-span-2 lg:border-l lg:border-t-0">
            <div className="group relative h-52 overflow-hidden rounded-2xl bg-slate-200 shadow-sm">
              <img src={propertyPhotos[photo].url} alt={propertyPhotos[photo].title} className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent" />
              <div className="absolute bottom-0 left-0 right-0 p-4">
                <span className="rounded-md bg-white/90 px-2 py-1 text-[10px] font-bold text-slate-700 backdrop-blur">{propertyPhotos[photo].label}</span>
                <p className="mt-1.5 text-xs font-semibold text-white">{propertyPhotos[photo].title}</p>
              </div>
            </div>
            <div className="mt-3 grid grid-cols-4 gap-2">
              {propertyPhotos.map((p,i) => (
                <button key={p.label} onClick={()=>setPhoto(i)} className={`relative h-11 overflow-hidden rounded-xl border-2 transition-all ${photo===i?'border-emerald-500 shadow-md shadow-emerald-500/20':'border-transparent hover:border-slate-300'}`}>
                  <img src={p.url} alt={p.label} className="h-full w-full object-cover" />
                  <span className="absolute inset-x-0 bottom-0 bg-black/60 py-0.5 text-center text-[9px] font-semibold text-white">{p.label}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ── METRIC CARDS ── */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        {[
          { label:'Kas Terealisasi', value:rupiah(totalLunas), sub:`${expenses.filter(e=>(e.status??'Lunas')==='Lunas').length} transaksi lunas`, icon:Wallet,          ibg:'bg-emerald-500', light:'bg-emerald-50', tc:'text-emerald-600' },
          { label:'Belum Dilunasi',  value:rupiah(totalBelum), sub:`${unpaidList.length} transaksi pending`,                                          icon:CircleDollarSign, ibg:'bg-red-500',     light:'bg-red-50',     tc:'text-red-600' },
          { label:'Utilitas & WiFi', value:rupiah(utilities),  sub:'Listrik / Air / Internet',                                                        icon:Zap,              ibg:'bg-amber-500',   light:'bg-amber-50',   tc:'text-amber-600' },
          { label:'Total Beban',     value:rupiah(total),      sub:`${expenses.length} total transaksi`,                                              icon:BarChart3,        ibg:'bg-blue-500',    light:'bg-blue-50',    tc:'text-blue-600' },
          { label:'Rasio Pelunasan', value:`${ratio}%`,         sub:'Realisasi pembayaran',                                                            icon:TrendingUp,       ibg:'bg-emerald-500', light:'bg-emerald-50', tc:'text-emerald-600' },
        ].map(({ label, value, sub, icon: Icon, ibg, light, tc }) => (
          <div key={label} className="card group relative overflow-hidden p-5 transition-all hover:shadow-md">
            <div className={`absolute right-0 top-0 h-24 w-24 rounded-full ${light} opacity-60 blur-2xl -translate-y-1/2 translate-x-1/2`} />
            <div className="flex items-start justify-between">
              <span className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">{label}</span>
              <div className={`flex h-8 w-8 items-center justify-center rounded-xl ${ibg} text-white shadow-sm`}><Icon size={14} /></div>
            </div>
            <p className="mt-3 text-xl font-bold tracking-tight text-slate-900">{value}</p>
            <p className={`mt-1 text-[11px] font-medium ${tc}`}>{sub}</p>
          </div>
        ))}
      </div>

      {/* ── CHART ── */}
      <MonthlyChart expenses={expenses} />

      {/* ── BOTTOM ROW ── */}
      <div className="grid gap-5 lg:grid-cols-12">
        {/* Distribusi */}
        <div className="card p-6 lg:col-span-4">
          <div className="mb-5 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold text-slate-900">Distribusi Beban</h3>
              <p className="mt-0.5 text-xs text-slate-400">Per kategori pengeluaran</p>
            </div>
            <button onClick={()=>setTab('laporan')} className="flex items-center gap-1 text-xs font-semibold text-emerald-600 hover:text-emerald-700">
              Detail <ArrowUpRight size={12} />
            </button>
          </div>
          <div className="space-y-3.5">
            {categoryTotals.slice(0,6).map(({category,amount}) => (
              <div key={category}>
                <div className="mb-1.5 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className={`h-2 w-2 rounded-full ${getCategoryMeta(category).dot}`} />
                    <span className="text-xs font-medium text-slate-600">{category}</span>
                  </div>
                  <span className="text-xs font-semibold text-slate-800">{rupiahShort(amount)}</span>
                </div>
                <div className={`h-1.5 w-full overflow-hidden rounded-full bg-slate-100`}>
                  <div className={`h-full rounded-full ${getCategoryMeta(category).dot} opacity-70 transition-all duration-500`} style={{width:`${Math.max((amount/(total||1))*100,4)}%`}} />
                </div>
              </div>
            ))}
          </div>
          {!categoryTotals.length && <p className="py-8 text-center text-xs text-slate-400">Belum ada data.</p>}
        </div>

        {/* Tagihan belum lunas */}
        <div className="card overflow-hidden lg:col-span-8">
          <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
            <div className="flex items-center gap-3">
              <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-red-500" />
              <div>
                <h3 className="text-sm font-semibold text-slate-900">Tagihan Belum Lunas</h3>
                <p className="text-xs text-slate-400">Perlu segera diselesaikan</p>
              </div>
            </div>
            <span className={`rounded-xl border px-3 py-1 text-xs font-bold ${unpaidList.length>0?'border-red-200 bg-red-50 text-red-600':'border-emerald-200 bg-emerald-50 text-emerald-600'}`}>
              {unpaidList.length} Tagihan
            </span>
          </div>
          {unpaidList.length===0
            ? <div className="flex flex-col items-center gap-2 py-12 text-center"><CheckCircle2 size={32} className="text-emerald-300" /><p className="text-sm font-medium text-slate-400">Semua tagihan sudah lunas!</p></div>
            : <TxTable expenses={unpaidList.slice(0,5)} loading={loading} openEdit={openEdit} setRemoveTarget={setRemoveTarget} onLunaskan={onLunaskan} compact />
          }
        </div>
      </div>

      {/* ── RECENT ── */}
      <div className="card overflow-hidden">
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
          <div>
            <h3 className="text-sm font-semibold text-slate-900">Transaksi Terkini</h3>
            <p className="text-xs text-slate-400">5 kas keluar terakhir</p>
          </div>
          <button onClick={()=>setTab('transaksi')} className="flex items-center gap-1 text-xs font-semibold text-emerald-600 hover:text-emerald-700">Lihat semua <ChevronRight size={12}/></button>
        </div>
        <TxTable expenses={expenses.slice(0,5)} loading={loading} openEdit={openEdit} setRemoveTarget={setRemoveTarget} onLunaskan={onLunaskan} compact />
      </div>
    </div>
  );
}

/* ════════════════════════════════════════════════
   MONTHLY CHART
════════════════════════════════════════════════ */
function MonthlyChart({ expenses }: { expenses: Expense[] }) {
  const mN: Record<string,string> = {'01':'Jan','02':'Feb','03':'Mar','04':'Apr','05':'Mei','06':'Jun','07':'Jul','08':'Agt','09':'Sep','10':'Okt','11':'Nov','12':'Des'};
  const map: Record<string,number> = {};
  expenses.forEach(e => { const k=e.transaction_date.substring(0,7); map[k]=(map[k]??0)+Number(e.amount); });
  const bars = Object.keys(map).sort().slice(-6).map(ym => { const [,m]=ym.split('-'); return {label:mN[m]??m, amount:map[ym], key:ym}; });
  const max  = Math.max(...bars.map(b=>b.amount),1);
  const cur  = new Date().toISOString().substring(0,7);

  return (
    <div className="card p-6">
      <div className="flex items-start justify-between">
        <div>
          <h3 className="text-sm font-semibold text-slate-900">Tren Pengeluaran Bulanan</h3>
          <p className="mt-0.5 text-xs text-slate-400">Perbandingan kas keluar 6 bulan terakhir</p>
        </div>
        <span className="rounded-xl bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-600">{new Date().getFullYear()}</span>
      </div>
      <div className="mt-8 flex h-40 items-end gap-2 sm:gap-4">
        {bars.length===0
          ? <p className="w-full text-center text-xs text-slate-400">Belum ada data.</p>
          : bars.map(item => (
            <div key={item.key} className="group flex h-full flex-1 flex-col items-center justify-end gap-1">
              <span className="hidden text-[9px] font-semibold text-slate-400 group-hover:block">{rupiahShort(item.amount)}</span>
              <div className={`relative w-full max-w-12 overflow-hidden rounded-t-xl transition-all duration-300 hover:opacity-90 ${item.key===cur ? 'bg-emerald-500 shadow-lg shadow-emerald-500/25' : 'bg-slate-200 hover:bg-slate-300'}`}
                style={{height:`${Math.max((item.amount/max)*85,8)}%`}}>
                {item.key===cur && <div className="absolute inset-0 bg-gradient-to-t from-emerald-600 to-emerald-400" />}
              </div>
              <span className={`text-[10px] font-medium ${item.key===cur?'text-emerald-600 font-bold':'text-slate-400'}`}>{item.label}</span>
            </div>
          ))
        }
      </div>
    </div>
  );
}

/* ════════════════════════════════════════════════
   TRANSAKSI
════════════════════════════════════════════════ */
function Transactions({ expenses, allExpenses, query, setQuery, categoryFilter, setCategoryFilter, statusFilter, setStatusFilter, dateFilter, setDateFilter, periodMode, setPeriodMode, openAdd, openEdit, setRemoveTarget, exportCsv, loading, onLunaskan }: {
  expenses:Expense[]; allExpenses:Expense[]; query:string; setQuery:(v:string)=>void;
  categoryFilter:'Semua Kategori'|Category; setCategoryFilter:(v:'Semua Kategori'|Category)=>void;
  statusFilter:'Semua Status'|PaymentStatus; setStatusFilter:(v:'Semua Status'|PaymentStatus)=>void;
  dateFilter:string; setDateFilter:(v:string)=>void;
  periodMode:'semua'|'bulan'|'tahun'; setPeriodMode:(v:'semua'|'bulan'|'tahun')=>void;
  openAdd:()=>void; openEdit:(e:Expense)=>void; setRemoveTarget:(e:Expense)=>void;
  exportCsv:()=>void; loading:boolean; onLunaskan:(e:Expense)=>void;
}) {
  const uY = [...new Set(allExpenses.map(e=>e.transaction_date.substring(0,4)))].sort((a,b)=>b.localeCompare(a));
  const uM = [...new Set(allExpenses.map(e=>e.transaction_date.substring(0,7)))].sort((a,b)=>b.localeCompare(a));
  const mN: Record<string,string> = {'01':'Januari','02':'Februari','03':'Maret','04':'April','05':'Mei','06':'Juni','07':'Juli','08':'Agustus','09':'September','10':'Oktober','11':'November','12':'Desember'};
  const hm = (m:'semua'|'bulan'|'tahun') => { setPeriodMode(m); setDateFilter('semua'); };
  const hasFilter = query || categoryFilter!=='Semua Kategori' || statusFilter!=='Semua Status' || (periodMode!=='semua' && dateFilter!=='semua');

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-widest text-emerald-600">Pencatatan Kas</p>
          <h2 className="text-2xl font-bold tracking-tight text-slate-900">Buku Pengeluaran Kas</h2>
        </div>
        <button onClick={openAdd} className="btn-primary self-start"><Plus size={14} /> Catat Transaksi</button>
      </div>

      <div className="card overflow-hidden">
        {/* Filter bar */}
        <div className="flex flex-wrap gap-2.5 border-b border-slate-100 bg-slate-50/50 p-4">
          <label className="relative min-w-[200px] flex-1">
            <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Cari nomor BKK, uraian, vendor..." className="form-input-sm pl-9" />
          </label>

          <select value={categoryFilter} onChange={e=>setCategoryFilter(e.target.value as 'Semua Kategori'|Category)} className="form-input-sm w-auto">
            <option>Semua Kategori</option>{categories.map(c=><option key={c}>{c}</option>)}
          </select>

          <select value={statusFilter} onChange={e=>setStatusFilter(e.target.value as 'Semua Status'|PaymentStatus)} className="form-input-sm w-auto">
            <option>Semua Status</option><option>Lunas</option><option>Belum Lunas</option><option>Sebagian</option>
          </select>

          {/* Period toggle */}
          <div className="flex overflow-hidden rounded-lg border border-slate-200 text-xs">
            {(['semua','bulan','tahun'] as const).map(m => (
              <button key={m} onClick={()=>hm(m)} className={`px-3 py-2 font-medium transition-all ${periodMode===m?'bg-emerald-600 text-white':'bg-white text-slate-500 hover:bg-slate-50'}`}>
                {m==='semua'?'Semua':m==='bulan'?'Per Bulan':'Per Tahun'}
              </button>
            ))}
          </div>

          {periodMode!=='semua' && (
            <select value={dateFilter} onChange={e=>setDateFilter(e.target.value)} className="form-input-sm w-auto">
              <option value="semua">{periodMode==='bulan'?'Pilih Bulan':'Pilih Tahun'}</option>
              {periodMode==='bulan' ? uM.map(ym=>{const[y,m]=ym.split('-');return<option key={ym} value={ym}>{mN[m]} {y}</option>;}) : uY.map(y=><option key={y} value={y}>Tahun {y}</option>)}
            </select>
          )}

          <button onClick={exportCsv} className="btn-secondary text-xs py-2"><Download size={13} /> CSV</button>
        </div>

        {/* Active filter info */}
        {hasFilter && (
          <div className="flex items-center justify-between border-b border-slate-100 bg-emerald-50/60 px-4 py-2">
            <span className="text-xs font-medium text-emerald-700"><b>{expenses.length}</b> transaksi ditemukan</span>
            <button onClick={()=>{setQuery('');setCategoryFilter('Semua Kategori');setStatusFilter('Semua Status');hm('semua');}} className="text-xs font-semibold text-emerald-600 hover:underline">Reset filter</button>
          </div>
        )}

        <TxTable expenses={expenses} loading={loading} openEdit={openEdit} setRemoveTarget={setRemoveTarget} onLunaskan={onLunaskan} />
      </div>
    </div>
  );
}

/* ════════════════════════════════════════════════
   LAPORAN
════════════════════════════════════════════════ */
function Reports({ expenses, categoryTotals, exportCsv }: { expenses:Expense[]; categoryTotals:{category:Category;amount:number}[]; exportCsv:()=>void }) {
  const total      = expenses.reduce((s,e)=>s+Number(e.amount),0);
  const totalLunas = expenses.filter(e=>(e.status??'Lunas')==='Lunas').reduce((s,e)=>s+Number(e.amount),0);
  const totalBelum = expenses.filter(e=>(e.status??'Lunas')!=='Lunas').reduce((s,e)=>s+Number(e.amount),0);

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-widest text-emerald-600">Akuntansi</p>
          <h2 className="text-2xl font-bold tracking-tight text-slate-900">Laporan Kas Keluar</h2>
        </div>
        <div className="flex gap-2">
          <button onClick={()=>window.print()} className="btn-secondary text-xs"><Printer size={13}/> Cetak</button>
          <button onClick={exportCsv} className="btn-primary text-xs"><Download size={13}/> Ekspor CSV</button>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid gap-4 sm:grid-cols-3">
        {[
          {label:'Total Beban',    icon:CircleDollarSign, value:rupiah(total),      sub:'Seluruh periode',                                                                                   ibg:'bg-blue-50',    tc:'text-blue-600'},
          {label:'Kas Terealisasi',icon:CheckCircle2,     value:rupiah(totalLunas), sub:'Sudah dibayar',                                                                                     ibg:'bg-emerald-50', tc:'text-emerald-600'},
          {label:'Belum Dilunasi', icon:Clock,            value:rupiah(totalBelum), sub:`${expenses.filter(e=>(e.status??'Lunas')!=='Lunas').length} transaksi pending`,                     ibg:'bg-red-50',     tc:'text-red-600'},
        ].map(({label,icon:Icon,value,sub,ibg,tc})=>(
          <div key={label} className="card p-5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500">{label}</span>
              <div className={`rounded-xl p-2 ${ibg} ${tc}`}><Icon size={16}/></div>
            </div>
            <p className="mt-3 text-2xl font-bold tracking-tight text-slate-900">{value}</p>
            <p className={`mt-1 text-xs font-medium ${tc}`}>{sub}</p>
          </div>
        ))}
      </div>

      <div className="grid gap-5 lg:grid-cols-5">
        {/* Tabel kategori */}
        <div className="card overflow-hidden lg:col-span-3">
          <div className="border-b border-slate-100 px-6 py-4">
            <h3 className="text-sm font-semibold text-slate-900">Rekapitulasi per Kategori</h3>
            <p className="text-xs text-slate-400">Komposisi biaya operasional usaha kos</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[460px] text-xs">
              <thead className="border-b border-slate-100 bg-slate-50/60">
                <tr>
                  <th className="table-header">Kategori</th>
                  <th className="table-header text-center">Trx</th>
                  <th className="table-header text-right">Total</th>
                  <th className="table-header text-right">Porsi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {categoryTotals.map(({category,amount})=>(
                  <tr key={category} className="hover:bg-slate-50/80">
                    <td className="table-cell">
                      <div className="flex items-center gap-2">
                        <span className={`h-2 w-2 rounded-full ${getCategoryMeta(category).dot}`} />
                        <span className="font-medium text-slate-700">{category}</span>
                      </div>
                    </td>
                    <td className="table-cell text-center text-slate-500">{expenses.filter(e=>e.category===category).length}</td>
                    <td className="table-cell text-right font-semibold text-slate-800">{rupiah(amount)}</td>
                    <td className="table-cell text-right font-bold text-emerald-600">{total?`${((amount/total)*100).toFixed(1)}%`:'0%'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Status summary */}
        <div className="card p-6 lg:col-span-2">
          <h3 className="mb-4 text-sm font-semibold text-slate-900">Ringkasan Status</h3>
          <div className="space-y-3">
            {(['Lunas','Belum Lunas','Sebagian'] as PaymentStatus[]).map(s => {
              const cnt = expenses.filter(e=>(e.status??'Lunas')===s).length;
              const amt = expenses.filter(e=>(e.status??'Lunas')===s).reduce((sum,e)=>sum+Number(e.amount),0);
              const pct = total ? ((amt/total)*100).toFixed(0) : '0';
              return (
                <div key={s} className="rounded-xl border border-slate-100 bg-slate-50 p-4">
                  <div className="flex items-center justify-between">
                    <StatusBadge status={s} />
                    <span className="text-xs font-semibold text-slate-700">{rupiah(amt)}</span>
                  </div>
                  <div className="mt-2.5 h-1.5 overflow-hidden rounded-full bg-slate-200">
                    <div className={`h-full rounded-full transition-all ${s==='Lunas'?'bg-emerald-500':s==='Belum Lunas'?'bg-red-400':'bg-amber-400'}`} style={{width:`${pct}%`}} />
                  </div>
                  <p className="mt-1.5 text-[10px] text-slate-400">{cnt} transaksi · {pct}% dari total</p>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ════════════════════════════════════════════════
   KATEGORI
════════════════════════════════════════════════ */
function Categories({ categoryTotals, total }: { categoryTotals:{category:Category;amount:number}[]; total:number }) {
  return (
    <div className="space-y-5">
      <div>
        <p className="text-[10px] font-bold uppercase tracking-widest text-emerald-600">Master Data</p>
        <h2 className="text-2xl font-bold tracking-tight text-slate-900">Kategori Biaya Operasional</h2>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {categories.map(cat => {
          const data = categoryTotals.find(e=>e.category===cat);
          const pct  = total && data ? ((data.amount/total)*100).toFixed(0) : '0';
          return (
            <div key={cat} className="card p-5 transition-all hover:shadow-md">
              <div className={`mb-4 inline-flex h-10 w-10 items-center justify-center rounded-xl border ${getCategoryMeta(cat).color}`}>
                <Tags size={16} />
              </div>
              <h3 className="text-sm font-semibold text-slate-800">{cat}</h3>
              <p className="mt-1 text-lg font-bold text-slate-900">{data?.amount ? rupiah(data.amount) : '—'}</p>
              {data?.amount ? (
                <div className="mt-3">
                  <div className="h-1.5 overflow-hidden rounded-full bg-slate-100">
                    <div className={`h-full rounded-full ${getCategoryMeta(cat).dot} opacity-70`} style={{width:`${pct}%`}} />
                  </div>
                  <p className="mt-1.5 text-[10px] font-medium text-slate-400">{pct}% dari total beban</p>
                </div>
              ) : <p className="mt-2 text-xs text-slate-400">Belum ada transaksi</p>}
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ════════════════════════════════════════════════
   PENGATURAN
════════════════════════════════════════════════ */
function SettingsPage({ profile, onSave }: { profile:{business_name:string;business_address:string;manager_name:string}; onSave:(p:typeof profile)=>Promise<void> }) {
  const [draft, setDraft] = useState(profile);
  useEffect(()=>setDraft(profile),[profile]);
  return (
    <div className="space-y-5">
      <div>
        <p className="text-[10px] font-bold uppercase tracking-widest text-emerald-600">Konfigurasi</p>
        <h2 className="text-2xl font-bold tracking-tight text-slate-900">Pengaturan</h2>
      </div>
      <div className="grid max-w-4xl gap-5 lg:grid-cols-[200px_1fr]">
        {/* Sidebar */}
        <div className="card p-2 h-fit">
          <button className="flex w-full items-center gap-3 rounded-xl bg-emerald-50 px-4 py-3 text-xs font-semibold text-emerald-700"><Settings2 size={14}/> Profil Usaha</button>
          <button className="flex w-full items-center gap-3 rounded-xl px-4 py-3 text-xs font-medium text-slate-500 hover:bg-slate-50 mt-0.5"><Users size={14}/> Akun Pengguna</button>
        </div>

        {/* Form */}
        <div className="card p-7">
          <div className="mb-6 border-b border-slate-100 pb-5">
            <h3 className="font-semibold text-slate-900">Informasi Usaha Kos</h3>
            <p className="mt-1 text-xs text-slate-400">Ditampilkan pada laporan dan header sistem.</p>
          </div>
          <form onSubmit={e=>{e.preventDefault();void onSave(draft);}} className="space-y-5">
            <label><span className="form-label">Nama Usaha</span><input value={draft.business_name} onChange={e=>setDraft({...draft,business_name:e.target.value})} className="form-input" required /></label>
            <label><span className="form-label">Alamat Usaha</span><textarea value={draft.business_address} onChange={e=>setDraft({...draft,business_address:e.target.value})} rows={3} className="form-input resize-none" required /></label>
            <label><span className="form-label">Nama Administrator</span><input value={draft.manager_name} onChange={e=>setDraft({...draft,manager_name:e.target.value})} className="form-input" required /></label>
            <div className="flex justify-end border-t border-slate-100 pt-5">
              <button type="submit" className="btn-primary"><Sparkles size={14}/> Simpan Perubahan</button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

/* ════════════════════════════════════════════════
   SHARED — TABLE
════════════════════════════════════════════════ */
function TxTable({ expenses, loading, openEdit, setRemoveTarget, onLunaskan, compact=false }: {
  expenses:Expense[]; loading:boolean; openEdit:(e:Expense)=>void;
  setRemoveTarget:(e:Expense)=>void; onLunaskan?:(e:Expense)=>void; compact?:boolean;
}) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[860px] text-left">
        <thead>
          <tr className="border-b border-slate-100 bg-slate-50/50">
            <th className="table-header">No. BKK / Tanggal</th>
            <th className="table-header">Kategori & Uraian</th>
            <th className="table-header">Unit / Vendor</th>
            <th className="table-header">Nominal</th>
            <th className="table-header">Metode</th>
            <th className="table-header text-center">Status</th>
            <th className="table-header text-center">Aksi</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-50">
          {loading ? (
            <tr><td colSpan={7} className="px-6 py-12 text-center text-sm text-slate-400">Memuat data...</td></tr>
          ) : expenses.length===0 ? (
            <tr><td colSpan={7} className="px-6 py-12 text-center text-sm text-slate-400">Tidak ada transaksi ditemukan.</td></tr>
          ) : expenses.map(item => {
            const st = item.status ?? 'Lunas';
            const belumLunas = st !== 'Lunas';
            return (
              <tr key={item.id} className="group transition-colors hover:bg-slate-50/80">
                <td className="table-cell">
                  <p className="font-mono text-xs font-semibold text-slate-800">{item.transaction_number}</p>
                  <p className="mt-0.5 text-[10px] text-slate-400">{dateText(item.transaction_date)}</p>
                </td>
                <td className="table-cell max-w-[220px]">
                  <p className="font-medium text-slate-800 leading-snug">{item.description}</p>
                  <span className={`mt-1.5 inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-semibold ${getCategoryMeta(item.category).color}`}>
                    <span className={`h-1.5 w-1.5 rounded-full ${getCategoryMeta(item.category).dot}`} />{item.category}
                  </span>
                </td>
                <td className="table-cell">
                  {item.unit_kamar && item.unit_kamar!=='Semua Kamar' && (
                    <span className="flex items-center gap-1 text-[10px] font-medium text-slate-600"><Home size={9}/>{item.unit_kamar}</span>
                  )}
                  {item.vendor && item.vendor!=='-' && item.vendor && (
                    <span className="block text-[10px] text-slate-400 mt-0.5">{item.vendor}</span>
                  )}
                  {(!item.unit_kamar||item.unit_kamar==='Semua Kamar')&&(!item.vendor||item.vendor==='-') && <span className="text-xs text-slate-300">—</span>}
                </td>
                <td className="table-cell whitespace-nowrap font-bold text-slate-900">{rupiah(Number(item.amount))}</td>
                <td className="table-cell whitespace-nowrap">
                  <span className={`inline-flex items-center gap-1 rounded-lg px-2 py-1 text-[10px] font-semibold ${getMethodMeta(item.payment_method).bg} ${getMethodMeta(item.payment_method).text}`}>
                    <CreditCard size={9}/>{item.payment_method??'Tunai'}
                  </span>
                </td>
                <td className="table-cell text-center"><StatusBadge status={st}/></td>
                <td className="table-cell">
                  <div className="flex items-center justify-center gap-1">
                    {onLunaskan && belumLunas && (
                      <button onClick={()=>onLunaskan(item)}
                        className="flex items-center gap-1 rounded-lg border border-emerald-200 bg-emerald-50 px-2.5 py-1.5 text-[10px] font-bold text-emerald-700 transition-all hover:bg-emerald-100 hover:shadow-sm">
                        <Check size={10}/> Lunaskan
                      </button>
                    )}
                    <button onClick={()=>openEdit(item)} className="btn-ghost" title="Edit"><Edit3 size={13}/></button>
                    <button onClick={()=>setRemoveTarget(item)} className="btn-ghost hover:bg-red-50 hover:text-red-500" title="Hapus"><Trash2 size={13}/></button>
                    {compact && <button className="btn-ghost"><ChevronDown size={13}/></button>}
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

/* ════════════════════════════════════════════════
   SHARED — STATUS BADGE
════════════════════════════════════════════════ */
function StatusBadge({ status }: { status?: string }) {
  const m = getStatusMeta(status);
  const Icon = m.icon;
  return (
    <span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[10px] font-semibold ${m.bg} ${m.text} ${m.border}`}>
      <Icon size={10} strokeWidth={2.5}/>{m.label}
    </span>
  );
}

/* ════════════════════════════════════════════════
   MODAL — EXPENSE FORM
════════════════════════════════════════════════ */
function ExpenseModal({ mode, form, setForm, onClose, onSubmit, expenseCount }: {
  mode:'add'|'edit'; form:FormState; setForm:(v:FormState)=>void;
  onClose:()=>void; onSubmit:(e:FormEvent<HTMLFormElement>)=>void; expenseCount:number;
}) {
  const u = (k: keyof FormState, v: string) => setForm({...form,[k]:v});
  const handleDate = (v: string) => setForm({...form, transaction_date:v, transaction_number: mode==='add' ? makeBkk(v,expenseCount) : form.transaction_number});

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/50 backdrop-blur-sm p-4 sm:items-center">
      <div className="w-full max-w-2xl rounded-3xl bg-white shadow-2xl animate-slide-up">
        {/* Header */}
        <div className="flex items-center justify-between rounded-t-3xl bg-gradient-to-r from-emerald-600 to-emerald-700 px-7 py-5 text-white">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white/15"><Receipt size={18}/></div>
            <div>
              <h2 className="text-base font-bold">{mode==='add'?'Catat Pengeluaran Kas Baru':'Edit Transaksi Pengeluaran'}</h2>
              <p className="text-xs text-emerald-200">Lengkapi seluruh informasi biaya operasional</p>
            </div>
          </div>
          <button onClick={onClose} className="rounded-xl p-2 hover:bg-white/15 transition-colors"><X size={18}/></button>
        </div>

        <form onSubmit={onSubmit} className="p-7 space-y-5">
          {/* Row 1 */}
          <div className="grid gap-4 sm:grid-cols-2">
            <label>
              <span className="form-label">Nomor BKK <span className="normal-case font-normal text-slate-400">(Otomatis)</span></span>
              <input value={form.transaction_number} onChange={e=>u('transaction_number',e.target.value)} className="form-input font-mono" required />
            </label>
            <label>
              <span className="form-label">Tanggal Transaksi</span>
              <input type="date" value={form.transaction_date} onChange={e=>handleDate(e.target.value)} className="form-input" required />
            </label>
          </div>

          {/* Row 2 */}
          <div className="grid gap-4 sm:grid-cols-2">
            <label>
              <span className="form-label">Kategori Biaya</span>
              <select value={form.category} onChange={e=>u('category',e.target.value)} className="form-input">
                {categories.map(c=><option key={c}>{c}</option>)}
              </select>
            </label>
            <label>
              <span className="form-label">Unit / Alokasi Kamar</span>
              <select value={form.unit_kamar} onChange={e=>u('unit_kamar',e.target.value)} className="form-input">
                {unitOptions.map(o=><option key={o}>{o}</option>)}
              </select>
            </label>
          </div>

          {/* Uraian */}
          <label>
            <span className="form-label">Uraian / Deskripsi Pengeluaran</span>
            <textarea rows={2} value={form.description} onChange={e=>u('description',e.target.value)}
              placeholder="Contoh: Pembelian token listrik utama 200rb × 2 & kabel cadangan"
              className="form-input resize-none" required />
          </label>

          {/* Row 3 */}
          <div className="grid gap-4 sm:grid-cols-2">
            <label>
              <span className="form-label">Vendor / Penerima Uang</span>
              <input value={form.vendor} onChange={e=>u('vendor',e.target.value)} placeholder="Contoh: PLN / Pak Joko Tukang" className="form-input" />
            </label>
            <label>
              <span className="form-label">Nominal Biaya (Rp)</span>
              <input type="number" min="1" value={form.amount} onChange={e=>u('amount',e.target.value)} placeholder="450000" className="form-input" required />
            </label>
          </div>

          {/* Row 4 */}
          <div className="grid gap-4 sm:grid-cols-2">
            <label>
              <span className="form-label">Metode Pembayaran</span>
              <select value={form.payment_method} onChange={e=>u('payment_method',e.target.value)} className="form-input">
                {paymentMethods.map(m=><option key={m}>{m}</option>)}
              </select>
            </label>
            <label>
              <span className="form-label">Status Pelunasan</span>
              <select value={form.status} onChange={e=>u('status',e.target.value)} className="form-input">
                <option value="Lunas">✅ Lunas (Sudah Dibayar)</option>
                <option value="Belum Lunas">🔴 Belum Lunas (Perlu Pelunasan)</option>
                <option value="Sebagian">🟡 Sebagian (DP / Cicilan)</option>
              </select>
            </label>
          </div>

          {/* Preview */}
          <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Preview:</span>
            <StatusBadge status={form.status} />
            <span className={`inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-[10px] font-semibold ${getMethodMeta(form.payment_method).bg} ${getMethodMeta(form.payment_method).text}`}>
              <CreditCard size={10}/>{form.payment_method}
            </span>
            {form.unit_kamar && form.unit_kamar!=='Semua Kamar' && (
              <span className="inline-flex items-center gap-1 rounded-lg bg-slate-200 px-2.5 py-1 text-[10px] font-semibold text-slate-600"><Home size={10}/>{form.unit_kamar}</span>
            )}
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-2 border-t border-slate-100 pt-5">
            <button type="button" onClick={onClose} className="btn-secondary">Batal</button>
            <button type="submit" className="btn-primary">
              <Check size={14} strokeWidth={2.5}/>{mode==='add'?'Simpan Transaksi':'Simpan Perubahan'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

/* ════════════════════════════════════════════════
   MODAL — CONFIRM DELETE
════════════════════════════════════════════════ */
function ConfirmDelete({ item, onClose, onConfirm }: { item:Expense; onClose:()=>void; onConfirm:()=>void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
      <div className="w-full max-w-sm rounded-3xl bg-white p-7 shadow-2xl animate-slide-up">
        <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-2xl bg-red-50 text-red-500"><Trash2 size={20}/></div>
        <h3 className="text-base font-bold text-slate-900">Hapus transaksi ini?</h3>
        <p className="mt-2 text-sm leading-relaxed text-slate-500">
          Transaksi <span className="font-semibold text-slate-700">{item.transaction_number}</span> akan dihapus permanen dari buku kas dan tidak dapat dikembalikan.
        </p>
        <div className="mt-6 grid grid-cols-2 gap-3">
          <button onClick={onClose} className="btn-secondary justify-center">Batal</button>
          <button onClick={onConfirm} className="flex items-center justify-center gap-2 rounded-xl bg-red-500 px-4 py-2.5 text-xs font-semibold text-white hover:bg-red-600 transition-all">
            <Trash2 size={13}/> Hapus
          </button>
        </div>
      </div>
    </div>
  );
}

export default App;
