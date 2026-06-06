import React, { useState, useEffect } from 'react';
import { doc, getDoc, setDoc, serverTimestamp, updateDoc } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../../lib/firebase';
import { Smartphone, Save, X, PanelTop, Library, CheckCircle2, ChevronRight, Package, ArrowLeft } from 'lucide-react';
import { Button } from '../ui/Button';

interface GondolaAppBuilderProps {
  supermarketId: string;
  gondolas: any[];
  products: any[];
}

const TEMPLATES = [
    { id: 'standard', name: 'Padrão (Metal Branco)', shelfColor: '#f1f5f9', background: '#ffffff', textColor: '#334155' },
    { id: 'wood', name: 'Rústico (Madeira)', shelfColor: '#d97706', background: '#fef3c7', textColor: '#78350f' },
    { id: 'dark', name: 'Premium (Escuro)', shelfColor: '#334155', background: '#0f172a', textColor: '#f8fafc' },
    { id: 'clean', name: 'Clean (Vidro/Gelo)', shelfColor: '#e2e8f0', background: '#f8fafc', textColor: '#0f172a' },
];

export default function GondolaAppBuilder({ supermarketId, gondolas, products }: GondolaAppBuilderProps) {
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    
    // Default to mobile view always for this tool, maybe a right pane for settings.
    const [config, setConfig] = useState<any>({
        templateId: 'standard',
        shelfColor: '#f1f5f9',
        backgroundColor: '#ffffff',
        textColor: '#334155',
        showTags: true,
        tagStyle: 'modern', // 'modern', 'classic', 'minimal'
        gondolaSpacing: 'medium' // 'tight', 'medium', 'relaxed'
    });

    useEffect(() => {
        const fetchConfig = async () => {
            try {
                const docRef = doc(db, `supermarkets/${supermarketId}/storefront/appConfig`);
                const docSnap = await getDoc(docRef);
                if (docSnap.exists()) {
                    setConfig(JSON.parse(docSnap.data().configJson));
                }
            } catch (err) {
                handleFirestoreError(err, OperationType.GET, `supermarkets/${supermarketId}/storefront/appConfig`);
            } finally {
                setLoading(false);
            }
        };
        fetchConfig();
    }, [supermarketId]);

    const handleSave = async () => {
        setSaving(true);
        try {
            const docRef = doc(db, `supermarkets/${supermarketId}/storefront/appConfig`);
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
            alert('Configuração do App salva com sucesso!');
        } catch (err) {
            handleFirestoreError(err, OperationType.UPDATE, `supermarkets/${supermarketId}/storefront/appConfig`);
        } finally {
            setSaving(false);
        }
    };

    if (loading) return <div className="p-8 text-center text-slate-500">Carregando construtor...</div>;

    const renderEditor = () => {
        return (
            <div className="p-6 space-y-6">
                <div>
                    <h3 className="font-bold text-slate-800 text-lg mb-1">Visual do Aplicativo</h3>
                    <p className="text-xs text-slate-500">Personalize a identidade do seu mercado no app do cliente: escolha temas, estilos de etiquetas e densidade de prateleiras.</p>
                </div>

                <div className="space-y-4">
                    <div>
                        <label className="block text-xs font-bold text-slate-500 mb-2">Tema Base da Gôndola</label>
                        <div className="grid grid-cols-2 gap-2">
                            {TEMPLATES.map(tmpl => (
                                <button
                                    key={tmpl.id}
                                    onClick={() => setConfig((prev:any) => ({ ...prev, templateId: tmpl.id, shelfColor: tmpl.shelfColor, backgroundColor: tmpl.background, textColor: tmpl.textColor }))}
                                    className={`p-3 rounded-xl border-2 text-left flex flex-col gap-2 ${config.templateId === tmpl.id ? 'border-blue-500 bg-blue-50/50' : 'border-slate-200 hover:border-slate-300'}`}
                                >
                                    <div className="flex items-center justify-between">
                                        <span className="font-bold text-sm text-slate-700">{tmpl.name}</span>
                                        {config.templateId === tmpl.id && <CheckCircle2 className="w-4 h-4 text-blue-500"/>}
                                    </div>
                                    <div className="flex gap-1 h-2 rounded overflow-hidden">
                                        <div className="flex-1" style={{backgroundColor: tmpl.shelfColor}}></div>
                                        <div className="flex-1" style={{backgroundColor: tmpl.background}}></div>
                                    </div>
                                </button>
                            ))}
                        </div>
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-slate-500 mb-1">Estilo de Preço (Etiqueta)</label>
                        <select className="w-full p-2.5 border-2 border-slate-200 rounded-xl outline-none focus:border-slate-800 bg-white" value={config.tagStyle || 'modern'} onChange={e => setConfig((prev:any) => ({...prev, tagStyle: e.target.value}))}>
                            <option value="modern">Moderno (Flutuante)</option>
                            <option value="classic">Clássico (Etiqueta Amarela)</option>
                            <option value="minimal">Minimalista (Sombra Leve)</option>
                        </select>
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-slate-500 mb-1">Espaçamento das Prateleiras</label>
                        <select className="w-full p-2.5 border-2 border-slate-200 rounded-xl outline-none focus:border-slate-800 bg-white" value={config.gondolaSpacing || 'medium'} onChange={e => setConfig((prev:any) => ({...prev, gondolaSpacing: e.target.value}))}>
                            <option value="tight">Justo (Muitos itens)</option>
                            <option value="medium">Normal</option>
                            <option value="relaxed">Espaçado (Limpo)</option>
                        </select>
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-slate-500 mb-1">Nome da Loja (Topo do App)</label>
                        <input className="w-full p-2.5 border-2 border-slate-200 rounded-xl outline-none focus:border-slate-800 bg-white" value={config.storeName || ''} onChange={e => setConfig((prev:any) => ({...prev, storeName: e.target.value}))} placeholder="Ex: Nexmarket"/>
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-slate-500 mb-1">Cor de Destaque (Principal)</label>
                        <input type="color" className="w-full p-1 border-2 border-slate-200 rounded-xl outline-none h-12 bg-white" value={config.accentColor || '#58CC02'} onChange={e => setConfig((prev:any) => ({...prev, accentColor: e.target.value}))} />
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-slate-500 mb-1">Fonte</label>
                        <select className="w-full p-2.5 border-2 border-slate-200 rounded-xl outline-none focus:border-slate-800 bg-white" value={config.fontFamily || 'sans'} onChange={e => setConfig((prev:any) => ({...prev, fontFamily: e.target.value}))}>
                            <option value="sans">Moderna (Sans)</option>
                            <option value="serif">Elegante (Serif)</option>
                            <option value="mono">Técnica (Mono)</option>
                        </select>
                    </div>
                </div>
            </div>
        );
    };

    return (
        <div className="flex flex-col h-[calc(100vh-140px)] bg-slate-100 rounded-3xl overflow-hidden border border-slate-200 relative">
            {/* Toolbar */}
            <div className="flex-shrink-0 h-16 bg-white border-b border-slate-200 flex items-center justify-between px-6 z-20">
                <div className="flex items-center gap-4">
                    <span className="font-bold text-slate-800 flex items-center gap-2"><Smartphone className="w-5 h-5 text-green-500"/> Visão do App (Gôndolas)</span>
                </div>
                <div className="flex items-center gap-3">
                    <Button size="sm" onClick={handleSave} disabled={saving}>
                        {saving ? 'Salvando...' : <span className="flex items-center gap-2"><Save className="w-4 h-4"/> Salvar Configuração</span>}
                    </Button>
                </div>
            </div>

            <div className="flex-1 flex overflow-hidden">
                {/* Center Panel: Preview Mobile */}
                <div className="flex-1 flex flex-col items-center justify-center bg-slate-200 p-8 overflow-y-auto">
                    {/* Phone Frame */}
                    <div 
                        className={`w-full max-w-[375px] h-[80vh] min-h-[600px] border-[12px] border-slate-800 rounded-[2.5rem] overflow-x-hidden overflow-y-auto relative shadow-2xl bg-white ${config.fontFamily === 'serif' ? 'font-serif' : config.fontFamily === 'mono' ? 'font-mono' : 'font-sans'}`}
                        style={{ backgroundColor: config.backgroundColor, color: config.textColor }}
                    >
                        {/* Notch */}
                        <div className="absolute top-0 inset-x-0 h-6 bg-slate-800 rounded-b-xl w-32 mx-auto z-50"></div>

                        {/* App Header */}
                        <div className="sticky top-0 z-40 px-4 py-3 flex items-center gap-3 border-b shadow-sm backdrop-blur" style={{ backgroundColor: `${config.backgroundColor}CC`, borderColor: 'rgba(0,0,0,0.05)' }}>
                             <ArrowLeft className="w-5 h-5 opacity-70"/>
                             <h1 className="font-bold text-lg flex-1 truncate">{config.storeName || gondolas[0]?.name || 'Gôndola Selecionada'}</h1>
                        </div>

                        {/* App Content */}
                        <div className={`p-4 space-y-6 ${config.gondolaSpacing === 'tight' ? 'py-2' : config.gondolaSpacing === 'relaxed' ? 'py-8' : 'py-4'}`}>
                            {gondolas.slice(0, 2).map((gondola) => {
                                const gondolaProducts = products.filter(p => p.gondolaId === gondola.id).slice(0, 4);
                                return (
                                    <div key={gondola.id} className="relative z-0">
                                        <h2 className="font-bold mb-4 px-2" style={{ color: config.textColor, opacity: 0.8 }}>{gondola.name}</h2>
                                        
                                        {/* Shelf Container */}
                                        <div className="relative">
                                            {/* Shelf Background Line */}
                                            <div className="absolute bottom-0 left-0 right-0 h-4 rounded-full shadow-lg" style={{ backgroundColor: config.shelfColor }}></div>
                                            
                                            <div className="flex overflow-x-auto pb-6 pt-2 px-2 gap-4 snap-x">
                                                {gondolaProducts.length > 0 ? (
                                                    gondolaProducts.map((pr) => (
                                                        <div key={pr.id} className="snap-center shrink-0 w-28 flex flex-col items-center group">
                                                            {/* Product Image Box */}
                                                            <div className="h-28 w-28 rounded-xl bg-white p-2 shadow-sm border border-black/5 flex justify-center items-center relative overflow-hidden mb-3">
                                                                {pr.imageUrl ? (
                                                                    <img src={pr.imageUrl} alt={pr.name} className="max-w-full max-h-full object-contain drop-shadow-sm" />
                                                                ) : (
                                                                    <Package className="w-10 h-10 text-slate-300"/>
                                                                )}
                                                            </div>

                                                            {/* Label */}
                                                            <div className="text-center w-full px-1 mb-1">
                                                                <h4 className="text-[10px] font-medium leading-tight line-clamp-2" style={{ color: config.textColor }}>{pr.name}</h4>
                                                            </div>

                                                            {/* Price Tag */}
                                                            {config.tagStyle === 'classic' ? (
                                                                <div className="bg-yellow-300 text-black px-2 py-1 rounded-sm border border-yellow-400 font-bold text-xs shadow-sm mt-auto relative rotate-[-2deg]">
                                                                    R$ {pr.price.toFixed(2)}
                                                                </div>
                                                            ) : config.tagStyle === 'minimal' ? (
                                                                <div className="font-bold text-sm mt-auto" style={{ color: config.textColor }}>
                                                                    <span className="text-[10px] opacity-70">R$</span> {pr.price.toFixed(2)}
                                                                </div>
                                                            ) : (
                                                                <div className="bg-white px-3 py-1 rounded-full shadow border-b-2 border-slate-100 font-black text-xs mt-auto whitespace-nowrap" style={{ color: config.accentColor || '#3b82f6' }}>
                                                                    R$ {pr.price.toFixed(2)}
                                                                </div>
                                                            )}
                                                        </div>
                                                    ))
                                                ) : (
                                                    Array.from({length: 3}).map((_, i) => (
                                                        <div key={i} className="snap-center shrink-0 w-28 flex flex-col items-center">
                                                            <div className="h-28 w-28 rounded-xl p-2 mb-3 shadow-sm border border-black/5 border-dashed" style={{backgroundColor: 'rgba(0,0,0,0.02)'}}></div>
                                                        </div>
                                                    ))
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>

                {/* Right Panel: Settings Inspector */}
                <div className="w-80 bg-white border-l border-slate-200 overflow-y-auto">
                    {renderEditor()}
                </div>
            </div>
        </div>
    );
}
