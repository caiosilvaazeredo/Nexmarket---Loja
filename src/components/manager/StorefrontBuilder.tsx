import React, { useState, useEffect } from 'react';
import { doc, getDoc, setDoc, serverTimestamp, updateDoc } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../../lib/firebase';
import { LayoutTemplate, Droplet, Type, Search, Plus, Save, Monitor, Smartphone, PanelTop, X, Trash2, ArrowUp, ArrowDown } from 'lucide-react';
import { Button } from '../ui/Button';

interface StorefrontBuilderProps {
  supermarketId: string;
  products: any[];
}

const TEMPLATES = [
    { id: 'fresh', name: 'Fresh Start', color: '#58CC02', font: 'font-sans' },
    { id: 'modern', name: 'Minimal Modern', color: '#000000', font: 'font-sans' },
    { id: 'elegant', name: 'Elegant Market', color: '#8b5a2b', font: 'font-serif' },
    { id: 'playful', name: 'Playful Grocer', color: '#FF5722', font: 'font-mono' },
    { id: 'brutalist', name: 'Brutalist Deal', color: '#222222', font: 'font-mono' },
    { id: 'ocean', name: 'Ocean Breeze', color: '#0288D1', font: 'font-sans' }
];

export default function StorefrontBuilder({ supermarketId, products }: StorefrontBuilderProps) {
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    
    const [leftPanelOpen, setLeftPanelOpen] = useState(true);
    const [rightPanelOpen, setRightPanelOpen] = useState(true);
    const [previewMode, setPreviewMode] = useState<'desktop' | 'mobile'>('desktop');
    
    const [config, setConfig] = useState<any>({
        templateId: 'fresh',
        primaryColor: '#58CC02',
        fontFamily: 'font-sans',
        sections: [
            { id: '1', type: 'hero', title: 'OFERTAS DO DIA', subtitle: 'Preços Inacreditáveis!', highlightColor: '#FF5722' },
            { id: '2', type: 'products', title: 'Destaques', productIds: [], displayStyle: 'grid', fontSize: 'normal' }
        ]
    });

    const [activeSectionId, setActiveSectionId] = useState<string | null>(null);

    useEffect(() => {
        const fetchConfig = async () => {
            try {
                const docRef = doc(db, `supermarkets/${supermarketId}/storefront/config`);
                const docSnap = await getDoc(docRef);
                if (docSnap.exists()) {
                    setConfig(JSON.parse(docSnap.data().configJson));
                }
            } catch (err) {
                handleFirestoreError(err, OperationType.GET, `supermarkets/${supermarketId}/storefront/config`);
            } finally {
                setLoading(false);
            }
        };
        fetchConfig();
    }, [supermarketId]);

    const handleSave = async () => {
        setSaving(true);
        try {
            const docRef = doc(db, `supermarkets/${supermarketId}/storefront/config`);
            const docSnap = await getDoc(docRef);
            if (docSnap.exists()) {
                await updateDoc(docRef, {
                    configJson: JSON.stringify(config),
                    updatedAt: serverTimestamp()
                });
            } else {
                await setDoc(docRef, {
                    supermarketId,
                    configJson: JSON.stringify(config),
                    updatedAt: serverTimestamp()
                });
            }
            alert('Estilo salvo com sucesso!');
        } catch (err) {
            handleFirestoreError(err, OperationType.UPDATE, `supermarkets/${supermarketId}/storefront/config`);
        } finally {
            setSaving(false);
        }
    };

    const updateSection = (id: string, updates: any) => {
        setConfig((prev: any) => ({
            ...prev,
            sections: prev.sections.map((s: any) => s.id === id ? { ...s, ...updates } : s)
        }));
    };

    const addSection = (type: string) => {
        const newSection = { id: Math.random().toString(36).substr(2, 9), type, title: `Nova Seção ${type}` };
        if (type === 'products') {
            Object.assign(newSection, { productIds: [], displayStyle: 'grid', fontSize: 'normal' });
        }
        if (type === 'promo') {
            Object.assign(newSection, { subtitle: 'Descrição da promo', color: '#ff0000', titleFontSize: 'normal', subtitleFontSize: 'normal' });
        }
        if (type === 'hero') {
            Object.assign(newSection, { subtitle: 'Preços Inacreditáveis!', highlightColor: '#FF5722', titleFontSize: 'normal', subtitleFontSize: 'normal' });
        }
        setConfig((prev: any) => ({
            ...prev,
            sections: [...prev.sections, newSection]
        }));
    };

    const removeSection = (id: string) => {
        setConfig((prev: any) => ({ ...prev, sections: prev.sections.filter((s:any) => s.id !== id) }));
        if (activeSectionId === id) setActiveSectionId(null);
    };

    const moveSection = (index: number, direction: 'up'|'down') => {
        if (direction === 'up' && index === 0) return;
        if (direction === 'down' && index === config.sections.length - 1) return;
        
        setConfig((prev: any) => {
            const newSections = [...prev.sections];
            const swapIndex = direction === 'up' ? index - 1 : index + 1;
            [newSections[index], newSections[swapIndex]] = [newSections[swapIndex], newSections[index]];
            return { ...prev, sections: newSections };
        });
    };

    if (loading) return <div className="p-8 text-center text-slate-500">Carregando construtor...</div>;

    const renderEditor = () => {
        if (!activeSectionId) {
            return (
                <div className="p-8 text-center flex flex-col items-center justify-center h-full text-slate-400">
                    <LayoutTemplate className="w-16 h-16 mb-4 opacity-50"/>
                    <p>Selecione uma seção no painel central para editar.</p>
                </div>
            );
        }

        const section = config.sections.find((s:any) => s.id === activeSectionId);
        if (!section) return null;

        return (
            <div className="p-6 space-y-6 animate-in slide-in-from-right-4">
                <div className="flex items-center justify-between">
                    <h3 className="font-bold text-slate-800 text-lg">Editar {section.type === 'hero' ? 'Banner Principal' : section.type === 'products' ? 'Lista de Produtos' : section.type === 'promo' ? 'Faixa Promocional' : 'Seção'}</h3>
                    <button onClick={() => setActiveSectionId(null)} className="p-2 text-slate-400 hover:bg-slate-100 rounded-full"><X className="w-5 h-5"/></button>
                </div>

                <div className="space-y-4">
                    <div>
                        <label className="block text-xs font-bold text-slate-500 mb-1">Título</label>
                        <input type="text" className="w-full p-2 border-2 border-slate-200 rounded-lg outline-none focus:border-slate-800" value={section.title || ''} onChange={e => updateSection(section.id, { title: e.target.value })} />
                    </div>

                    {(section.type === 'hero' || section.type === 'promo') && (
                        <>
                            <div>
                                <label className="block text-xs font-bold text-slate-500 mb-1">Tamanho da Fonte: Título</label>
                                <select className="w-full p-2 border-2 border-slate-200 rounded-lg outline-none focus:border-slate-800 bg-white" value={section.titleFontSize || 'normal'} onChange={e => updateSection(section.id, { titleFontSize: e.target.value })}>
                                    <option value="small">Pequena</option>
                                    <option value="normal">Normal</option>
                                    <option value="large">Grande</option>
                                    <option value="xlarge">Extra Grande</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-500 mb-1">Subtítulo</label>
                                <input type="text" className="w-full p-2 border-2 border-slate-200 rounded-lg outline-none focus:border-slate-800" value={section.subtitle || ''} onChange={e => updateSection(section.id, { subtitle: e.target.value })} />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-500 mb-1">Tamanho da Fonte: Subtítulo</label>
                                <select className="w-full p-2 border-2 border-slate-200 rounded-lg outline-none focus:border-slate-800 bg-white" value={section.subtitleFontSize || 'normal'} onChange={e => updateSection(section.id, { subtitleFontSize: e.target.value })}>
                                    <option value="small">Pequena</option>
                                    <option value="normal">Normal</option>
                                    <option value="large">Grande</option>
                                    <option value="xlarge">Extra Grande</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-500 mb-1">Cor de Destaque</label>
                                <div className="flex gap-2">
                                    <input type="color" className="w-10 h-10 rounded cursor-pointer" value={section.highlightColor || section.color || '#000000'} onChange={e => updateSection(section.id, { highlightColor: e.target.value, color: e.target.value })} />
                                    <input type="text" className="flex-1 p-2 border-2 border-slate-200 rounded-lg outline-none focus:border-slate-800 font-mono text-sm uppercase" value={section.highlightColor || section.color || '#000000'} onChange={e => updateSection(section.id, { highlightColor: e.target.value, color: e.target.value })} />
                                </div>
                            </div>
                        </>
                    )}

                    {section.type === 'products' && (
                        <>
                            <div>
                                <label className="block text-xs font-bold text-slate-500 mb-1">Tamanho da Fonte dos Produtos</label>
                                <select className="w-full p-2 border-2 border-slate-200 rounded-lg outline-none focus:border-slate-800 bg-white" value={section.fontSize || 'normal'} onChange={e => updateSection(section.id, { fontSize: e.target.value })}>
                                    <option value="small">Pequena</option>
                                    <option value="normal">Normal</option>
                                    <option value="large">Grande</option>
                                    <option value="xlarge">Extra Grande (Destaque)</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-500 mb-1">Estilo de Exibição</label>
                                <select className="w-full p-2 border-2 border-slate-200 rounded-lg outline-none focus:border-slate-800 bg-white" value={section.displayStyle || 'grid'} onChange={e => updateSection(section.id, { displayStyle: e.target.value })}>
                                    <option value="grid">Grid Tradicional</option>
                                    <option value="list">Lista Compacta</option>
                                    <option value="carousel">Carrossel Horizontal</option>
                                    <option value="bento">Bento Box (Tamanhos Variados)</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-500 mb-2">Produtos Destacados ({section.productIds?.length || 0})</label>
                                <div className="max-h-60 overflow-y-auto border-2 border-slate-200 rounded-lg p-2 bg-slate-50 space-y-1">
                                    {products.map(pr => {
                                        const isSelected = section.productIds?.includes(pr.id);
                                        return (
                                            <div key={pr.id} className="flex items-center gap-2 p-2 hover:bg-slate-100 rounded border border-transparent hover:border-slate-200 cursor-pointer" onClick={() => {
                                                const newIds = isSelected ? section.productIds.filter((id:string)=>id!==pr.id) : [...(section.productIds||[]), pr.id];
                                                updateSection(section.id, { productIds: newIds });
                                            }}>
                                                <input type="checkbox" checked={isSelected} readOnly className="w-4 h-4 text-slate-800 rounded focus:ring-slate-800"/>
                                                <span className="text-sm font-medium text-slate-700 truncate flex-1">{pr.name}</span>
                                            </div>
                                        )
                                    })}
                                </div>
                            </div>
                        </>
                    )}
                </div>
            </div>
        );
    };

    return (
        <div className="flex flex-col h-[calc(100vh-140px)] bg-slate-100 rounded-3xl overflow-hidden border border-slate-200">
            {/* Toolbar */}
            <div className="flex-shrink-0 h-16 bg-white border-b border-slate-200 flex items-center justify-between px-6 z-20">
                <div className="flex items-center gap-4">
                    <button 
                        onClick={() => setLeftPanelOpen(!leftPanelOpen)}
                        className={`p-2 rounded-lg transition-colors ${leftPanelOpen ? 'bg-slate-100 text-slate-800' : 'text-slate-400 hover:bg-slate-50'}`}
                        title="Alternar Painel Esquerdo"
                    >
                        <PanelTop className="w-5 h-5 -rotate-90"/>
                    </button>
                    <span className="font-bold text-slate-800 flex items-center gap-2"><LayoutTemplate className="w-5 h-5 text-purple-500"/> Construtor</span>
                    <div className="h-6 w-px bg-slate-200 mx-1"></div>
                    <select 
                        value={config.templateId} 
                        onChange={e => {
                            const tmpl = TEMPLATES.find(t => t.id === e.target.value);
                            setConfig((prev:any) => ({ ...prev, templateId: tmpl?.id, primaryColor: tmpl?.color, fontFamily: tmpl?.font }));
                        }}
                        className="bg-slate-100 border border-slate-200 text-slate-700 font-bold py-1.5 px-3 rounded-lg outline-none text-sm"
                    >
                        {TEMPLATES.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                    </select>
                </div>

                <div className="flex items-center gap-2 bg-slate-100 p-1 rounded-lg">
                    <button 
                        onClick={() => setPreviewMode('desktop')} 
                        className={`p-1.5 rounded flex items-center gap-1 text-sm font-bold transition-all ${previewMode === 'desktop' ? 'bg-white shadow text-slate-800' : 'text-slate-400 hover:text-slate-600'}`}
                    >
                        <Monitor className="w-4 h-4"/>
                    </button>
                    <button 
                        onClick={() => setPreviewMode('mobile')} 
                        className={`p-1.5 rounded flex items-center gap-1 text-sm font-bold transition-all ${previewMode === 'mobile' ? 'bg-white shadow text-slate-800' : 'text-slate-400 hover:text-slate-600'}`}
                    >
                        <Smartphone className="w-4 h-4"/>
                    </button>
                </div>

                <div className="flex items-center gap-3">
                    <Button variant="secondary" size="sm" onClick={() => window.open(`/loja/${supermarketId}`, '_blank')}>Visualizar Loja</Button>
                    <Button size="sm" onClick={handleSave} disabled={saving}>
                        {saving ? 'Salvando...' : <span className="flex items-center gap-2"><Save className="w-4 h-4"/> Salvar</span>}
                    </Button>
                    <div className="h-6 w-px bg-slate-200 mx-1"></div>
                    <button 
                        onClick={() => setRightPanelOpen(!rightPanelOpen)}
                        className={`p-2 rounded-lg transition-colors ${rightPanelOpen ? 'bg-slate-100 text-slate-800' : 'text-slate-400 hover:bg-slate-50'}`}
                        title="Alternar Painel Direito"
                    >
                        <PanelTop className="w-5 h-5 rotate-90"/>
                    </button>
                </div>
            </div>

            {/* Main Editor Area */}
            <div className="flex-1 flex overflow-hidden">
                {/* Left Panel: Sections List */}
                <div className={`bg-white border-r border-slate-200 flex flex-col overflow-y-auto transition-all duration-300 ${leftPanelOpen ? 'w-64' : 'w-0 border-r-0'}`}>
                    <div className="p-4 border-b border-slate-100 font-bold text-slate-800 text-sm flex items-center justify-between whitespace-nowrap">
                        Estrutura da Página
                    </div>
                    <div className="p-2 space-y-1">
                        {config.sections.map((section: any, idx: number) => (
                            <div 
                                key={section.id} 
                                className={`flex items-center justify-between p-3 rounded-lg cursor-pointer transition-colors group ${activeSectionId === section.id ? 'bg-slate-800 text-white shadow-md' : 'hover:bg-slate-100 text-slate-600'}`}
                                onClick={() => setActiveSectionId(section.id)}
                            >
                                <div className="flex items-center gap-3 truncate">
                                    {section.type === 'hero' && <PanelTop className="w-4 h-4 opacity-70"/>}
                                    {section.type === 'products' && <LayoutTemplate className="w-4 h-4 opacity-70"/>}
                                    {section.type === 'promo' && <Droplet className="w-4 h-4 opacity-70"/>}
                                    <span className="font-medium text-sm truncate">{section.title || 'Seção'}</span>
                                </div>
                                <div className="hidden group-hover:flex items-center gap-1">
                                    <button onClick={(e) => { e.stopPropagation(); moveSection(idx, 'up'); }} className="p-1 hover:bg-white/20 rounded"><ArrowUp className="w-3 h-3"/></button>
                                    <button onClick={(e) => { e.stopPropagation(); moveSection(idx, 'down'); }} className="p-1 hover:bg-white/20 rounded"><ArrowDown className="w-3 h-3"/></button>
                                </div>
                            </div>
                        ))}
                    </div>
                    <div className="p-4 mt-auto">
                        <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Adicionar</p>
                        <div className="grid grid-cols-2 gap-2">
                            <button onClick={() => addSection('hero')} className="p-2 border border-slate-200 rounded text-xs font-bold text-slate-600 hover:bg-slate-50 flex flex-col items-center gap-1"><PanelTop className="w-4 h-4"/> Banner</button>
                            <button onClick={() => addSection('products')} className="p-2 border border-slate-200 rounded text-xs font-bold text-slate-600 hover:bg-slate-50 flex flex-col items-center gap-1"><LayoutTemplate className="w-4 h-4"/> Produtos</button>
                            <button onClick={() => addSection('promo')} className="col-span-2 p-2 border border-slate-200 rounded text-xs font-bold text-slate-600 hover:bg-slate-50 flex justify-center items-center gap-2"><Droplet className="w-4 h-4"/> Faixa Promo</button>
                        </div>
                    </div>
                </div>

                {/* Center Panel: Preview Wireframe */}
                <div className="flex-1 flex flex-col bg-slate-100 p-4 sm:p-8 overflow-y-auto items-center">
                    <div 
                        className={`bg-white shadow-2xl rounded-t-xl overflow-hidden min-h-[800px] border border-slate-200 transition-all duration-300 ${config.fontFamily} ${previewMode === 'mobile' ? 'w-full max-w-[375px]' : 'w-full max-w-4xl'}`}
                        style={{ '--theme-color': config.primaryColor } as any}
                    >
                        {/* Mock header */}
                        <div className="h-16 border-b border-slate-100 flex items-center justify-between px-8" style={{ borderTop: `4px solid ${config.primaryColor}` }}>
                            <div className="w-24 h-6 bg-slate-200 rounded"></div>
                            <div className="w-64 h-8 bg-slate-100 rounded-full"></div>
                            <div className="w-8 h-8 rounded-full bg-slate-100"></div>
                        </div>

                        {/* Rendering sections abstractly */}
                        <div className="space-y-4 py-8">
                            {config.sections.map((section: any) => (
                                <div 
                                    key={section.id}
                                    onClick={() => setActiveSectionId(section.id)}
                                    className={`relative cursor-pointer transition-all border-2 ${activeSectionId === section.id ? 'border-blue-500 shadow-md transform scale-[1.01] z-10' : 'border-transparent hover:border-slate-200'}`}
                                >
                                    {activeSectionId === section.id && (
                                        <div className="absolute top-2 right-2 flex gap-2 z-20">
                                            <button onClick={(e) => { e.stopPropagation(); removeSection(section.id); }} className="p-2 bg-red-500 text-white rounded-lg shadow"><Trash2 className="w-4 h-4"/></button>
                                        </div>
                                    )}

                                    {section.type === 'hero' && (
                                        <div className="mx-8 p-12 rounded-3xl text-white flex flex-col items-center justify-center text-center shadow-lg transform transition-all" style={{ backgroundColor: section.highlightColor || config.primaryColor }}>
                                            <span className={`px-4 py-1.5 rounded-full bg-white/20 backdrop-blur font-bold tracking-widest uppercase mb-4 ${
                                                section.titleFontSize === 'small' ? 'text-xs' : section.titleFontSize === 'large' ? 'text-lg' : section.titleFontSize === 'xlarge' ? 'text-2xl' : 'text-sm'
                                            }`}>{section.title}</span>
                                            <h2 className={`font-black tracking-tighter ${
                                                section.subtitleFontSize === 'small' ? 'text-2xl' : section.subtitleFontSize === 'large' ? 'text-5xl md:text-6xl' : section.subtitleFontSize === 'xlarge' ? 'text-6xl md:text-7xl' : 'text-4xl md:text-5xl'
                                            }`}>{section.subtitle}</h2>
                                        </div>
                                    )}

                                    {section.type === 'promo' && (
                                        <div className="mx-8 p-6 flex flex-col items-center text-center border-y-4 border-dashed" style={{ borderColor: section.highlightColor || config.primaryColor }}>
                                            <h3 className={`font-black uppercase mb-1 ${
                                                section.titleFontSize === 'small' ? 'text-lg' : section.titleFontSize === 'large' ? 'text-3xl' : section.titleFontSize === 'xlarge' ? 'text-4xl' : 'text-2xl'
                                            }`} style={{ color: section.highlightColor || config.primaryColor }}>{section.title}</h3>
                                            <p className={`text-slate-500 font-medium ${
                                                section.subtitleFontSize === 'small' ? 'text-sm' : section.subtitleFontSize === 'large' ? 'text-xl' : section.subtitleFontSize === 'xlarge' ? 'text-2xl' : 'text-base'
                                            }`}>{section.subtitle}</p>
                                        </div>
                                    )}

                                    {section.type === 'products' && (
                                        <div className="px-8 py-4">
                                            <h3 className="text-xl font-bold text-slate-800 mb-6 flex items-center gap-3">
                                                <div className="w-1 h-6 rounded-full" style={{ backgroundColor: config.primaryColor }}></div>
                                                {section.title}
                                            </h3>
                                            
                                            <div className="grid grid-cols-4 gap-4 opacity-80 pointer-events-none">
                                                {/* Preview mock cards */}
                                                {(section.productIds && section.productIds.length > 0) ? (
                                                    section.productIds.slice(0, 4).map((pid: string) => {
                                                        const p = products.find(prod=>prod.id === pid);
                                                        return (
                                                            <div key={pid} className="border border-slate-200 rounded-xl p-4 flex flex-col h-40">
                                                                <div className="flex-1 bg-slate-50 rounded-lg mb-2"></div>
                                                                <div className={`font-bold text-slate-700 truncate line-clamp-1 ${section.fontSize === 'large' ? 'text-lg' : section.fontSize === 'xlarge' ? 'text-xl' : section.fontSize === 'small' ? 'text-xs' : 'text-sm'}`}>{p?.name || 'Produto'}</div>
                                                                <div className="w-20 h-4 bg-slate-100 rounded mt-2"></div>
                                                            </div>
                                                        );
                                                    })
                                                ) : (
                                                    // Placeholder cards
                                                    Array.from({length: 4}).map((_, i) => (
                                                        <div key={i} className="border border-slate-200 rounded-xl p-4 flex flex-col h-40 bg-slate-50/50">
                                                            <div className="flex-1 bg-slate-100 rounded-lg mb-2"></div>
                                                            <div className="w-3/4 h-3 bg-slate-200 rounded mb-2"></div>
                                                            <div className="w-1/2 h-3 bg-slate-200 rounded"></div>
                                                        </div>
                                                    ))
                                                )}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Right Panel: Settings Inspector */}
                <div className={`bg-white border-l border-slate-200 overflow-y-auto shadow-[-4px_0_15px_-3px_rgba(0,0,0,0.05)] z-10 transition-all duration-300 ${rightPanelOpen ? 'w-80' : 'w-0 border-l-0'}`}>
                    <div className="w-80">
                        {renderEditor()}
                    </div>
                </div>
            </div>
        </div>
    );
}
