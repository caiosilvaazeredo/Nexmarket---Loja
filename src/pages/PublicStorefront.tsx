import React, { useEffect, useState, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { collection, doc, onSnapshot, query } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { Search, ShoppingCart, Clock, Minus, Plus, ShoppingBag, X, Package } from 'lucide-react';

export default function PublicStorefront() {
  const { smId } = useParams<{ smId: string }>();
  const [supermarket, setSupermarket] = useState<any>(null);
  const [gondolas, setGondolas] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [promotions, setPromotions] = useState<any[]>([]);
  const [storefrontConfig, setStorefrontConfig] = useState<any>(null);
  const [gondolaAppConfig, setGondolaAppConfig] = useState<any>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedGondolaId, setSelectedGondolaId] = useState<string | null>(null);

  // Cart state
  const [cart, setCart] = useState<{product: any, quantity: number}[]>([]);
  const [isCartOpen, setIsCartOpen] = useState(false);

  useEffect(() => {
    if (!smId) return;

    // Fetch supermarket
    const smUnsub = onSnapshot(doc(db, 'supermarkets', smId), (docSnap) => {
        if (docSnap.exists()) {
            setSupermarket({ id: docSnap.id, ...docSnap.data() });
        }
    }, (error) => handleFirestoreError(error, OperationType.GET, 'supermarkets'));

    // Fetch gondolas
    const gdQ = query(collection(db, `supermarkets/${smId}/gondolas`));
    const gdUnsub = onSnapshot(gdQ, (snapshot) => {
        const data: any[] = [];
        snapshot.forEach(doc => data.push({ id: doc.id, ...doc.data() }));
        setGondolas(data.sort((a,b) => a.order - b.order));
    }, (error) => handleFirestoreError(error, OperationType.LIST, `supermarkets/${smId}/gondolas`));

    // Fetch products
    const prQ = query(collection(db, `supermarkets/${smId}/products`));
    const prUnsub = onSnapshot(prQ, (snapshot) => {
        const data: any[] = [];
        snapshot.forEach(doc => data.push({ id: doc.id, ...doc.data() }));
        setProducts(data.sort((a,b) => (a.order||0) - (b.order||0)));
    }, (error) => handleFirestoreError(error, OperationType.LIST, `supermarkets/${smId}/products`));

    // Fetch promotions
    const pmQ = query(collection(db, `supermarkets/${smId}/promotions`));
    const pmUnsub = onSnapshot(pmQ, (snapshot) => {
        const data: any[] = [];
        snapshot.forEach(doc => data.push({ id: doc.id, ...doc.data() }));
        setPromotions(data.filter(p => p.active));
    }, (error) => handleFirestoreError(error, OperationType.LIST, `supermarkets/${smId}/promotions`));

    // Fetch storefront config
    const configUnsub = onSnapshot(doc(db, `supermarkets/${smId}/storefront/config`), (docSnap) => {
        if (docSnap.exists()) {
             setStorefrontConfig(JSON.parse(docSnap.data().configJson));
        }
    }, (error) => handleFirestoreError(error, OperationType.GET, `supermarkets/${smId}/storefront/config`));

    // Fetch gondola app config
    const appConfigUnsub = onSnapshot(doc(db, `supermarkets/${smId}/storefront/appConfig`), (docSnap) => {
        if (docSnap.exists()) {
             setGondolaAppConfig(JSON.parse(docSnap.data().configJson));
        }
    }, (error) => handleFirestoreError(error, OperationType.GET, `supermarkets/${smId}/storefront/appConfig`));

    return () => {
        smUnsub();
        gdUnsub();
        prUnsub();
        pmUnsub();
        configUnsub();
        appConfigUnsub();
    };
  }, [smId]);

  const toggleCartItem = (product: any, delta: number) => {
      setCart(prev => {
          const existing = prev.find(i => i.product.id === product.id);
          if (existing) {
              const newQuantity = existing.quantity + delta;
              if (newQuantity <= 0) return prev.filter(i => i.product.id !== product.id);
              return prev.map(i => i.product.id === product.id ? { ...i, quantity: newQuantity } : i);
          }
          if (delta > 0) return [...prev, { product, quantity: delta }];
          return prev;
      });
  };

  const getQuantity = (productId: string) => {
      return cart.find(i => i.product.id === productId)?.quantity || 0;
  };

  const getPromotionForProduct = (product: any) => {
      // Find the best promotional offer applied to this product.
      // Priority: Product target > Subcategory target > Category target
      const applicablePromos = promotions.filter(p => {
          if (p.targetType === 'product' && p.targetId === product.id) return true;
          if (p.targetType === 'subcategory' && p.targetId === product.subcategory) return true;
          if (p.targetType === 'category' && p.targetId === product.gondolaId) return true;
          return false;
      });

      if (applicablePromos.length === 0) return null;

      // Simplification: just return the first applicable one sorted by target hierarchy
      applicablePromos.sort((a, b) => {
          const rank = { 'product': 1, 'subcategory': 2, 'category': 3 };
          return rank[a.targetType as keyof typeof rank] - rank[b.targetType as keyof typeof rank];
      });

      return applicablePromos[0];
  };

  const getEffectivePrice = (product: any, qty: number = 1) => {
      const promo = getPromotionForProduct(product);
      if (!promo) return product.price * qty;

      if (promo.type === 'percentage') {
          return (product.price * (1 - promo.value / 100)) * qty;
      }
      if (promo.type === 'fixed') {
          return Math.max(0, product.price - promo.value) * qty;
      }
      if (promo.type === 'quantity' && promo.requiredQuantity) {
          const promoSets = Math.floor(qty / promo.requiredQuantity);
          const remainder = qty % promo.requiredQuantity;
          return (promoSets * promo.value) + (remainder * product.price);
      }
      return product.price * qty;
  };

  const cartTotal = useMemo(() => {
      return cart.reduce((acc, item) => acc + getEffectivePrice(item.product, item.quantity), 0);
  }, [cart, promotions]);

  // Fuzzy Search basic implementation
  const filteredProducts = useMemo(() => {
      return products.filter(p => {
          if (p.active === false) return false;
          if (selectedGondolaId && p.gondolaId !== selectedGondolaId) return false;
          
          if (!searchQuery) return true;

          const query = searchQuery.toLowerCase().replace(/[^a-z0-9]/gi, '');
          const targetString = [
              p.name,
              p.subcategory || '',
              gondolas.find(g => g.id === p.gondolaId)?.name || ''
          ].join(' ').toLowerCase().replace(/[^a-z0-9]/gi, '');
          
          // Allow some basic tolerance: if query chars appear in sequence
          let qIdx = 0;
          for (let i = 0; i < targetString.length && qIdx < query.length; i++) {
              if (targetString[i] === query[qIdx]) qIdx++;
          }
          return qIdx === query.length;
      });
  }, [products, searchQuery, selectedGondolaId, gondolas]);

  const [timeLeft, setTimeLeft] = useState(3600 * 4); // 4 hours in seconds
  useEffect(() => {
      const timer = setInterval(() => setTimeLeft(prev => prev > 0 ? prev - 1 : 0), 1000);
      return () => clearInterval(timer);
  }, []);
  const formatTime = (s: number) => new Date(s * 1000).toISOString().substr(11, 8);

  if (!supermarket) return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">Carregando loja...</div>
  );

  return (
    <div className="min-h-screen bg-slate-50 font-sans relative pb-24">
      {/* Header */}
      <header className="bg-white sticky top-0 z-30 shadow-sm border-b border-slate-200">
        <div style={{ backgroundColor: supermarket.themeColor || '#58CC02' }} className="h-2 w-full"></div>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
                {supermarket.logoUrl ? (
                    <img src={supermarket.logoUrl} alt={supermarket.name} className="h-10 w-10 object-contain" />
                ) : (
                    <div className="w-10 h-10 rounded bg-slate-100 flex items-center justify-center text-slate-400">
                        <ShoppingBag className="w-5 h-5"/>
                    </div>
                )}
                <h1 className="text-xl font-black text-slate-800 tracking-tight hidden sm:block">{supermarket.name}</h1>
            </div>

            <div className="flex-1 max-w-xl mx-auto relative">
                <Search className="absolute left-4 top-3 text-slate-400 w-5 h-5" />
                <input 
                    type="text" 
                    placeholder="Buscando algo específico?" 
                    className="w-full bg-slate-100 pl-12 pr-4 py-3 rounded-full border-2 border-transparent focus:bg-white focus:border-slate-300 outline-none text-slate-700 font-medium transition-all"
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                />
            </div>

            <button 
                onClick={() => setIsCartOpen(true)}
                className="hidden sm:flex items-center justify-center w-12 h-12 bg-slate-100 rounded-full hover:bg-slate-200 transition-colors relative"
            >
                <ShoppingCart className="w-5 h-5 text-slate-700" />
                {cart.length > 0 && (
                    <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] font-bold w-5 h-5 rounded-full flex items-center justify-center border-2 border-white">
                        {cart.reduce((a,b)=>a+b.quantity, 0)}
                    </span>
                )}
            </button>
        </div>
        
        {/* Gondolas Navigation */}
        <div className="border-t border-slate-100 bg-white">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex overflow-x-auto py-3 gap-2 no-scrollbar">
                    <button 
                        onClick={() => setSelectedGondolaId(null)}
                        className={`whitespace-nowrap px-4 py-2 rounded-full font-bold text-sm transition-all ${selectedGondolaId === null ? 'bg-slate-800 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
                    >
                        Todos
                    </button>
                    {gondolas.map(gd => (
                        <button 
                            key={gd.id}
                            onClick={() => setSelectedGondolaId(gd.id)}
                            className={`whitespace-nowrap px-4 py-2 rounded-full font-bold text-sm transition-all ${selectedGondolaId === gd.id ? 'bg-slate-800 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
                        >
                            {gd.name}
                        </button>
                    ))}
                </div>
            </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {(!searchQuery && !selectedGondolaId && storefrontConfig) && (
            <div className={`space-y-12 ${storefrontConfig.fontFamily}`}>
                {storefrontConfig.sections.map((section: any) => (
                    <div key={section.id}>
                        {section.type === 'hero' && (
                            <div className="p-12 rounded-3xl text-white flex flex-col items-center justify-center text-center shadow-lg" style={{ backgroundColor: section.highlightColor || storefrontConfig.primaryColor }}>
                                <span className={`px-4 py-1.5 rounded-full bg-white/20 backdrop-blur font-bold tracking-widest uppercase mb-4 ${
                                    section.titleFontSize === 'small' ? 'text-xs' : section.titleFontSize === 'large' ? 'text-lg' : section.titleFontSize === 'xlarge' ? 'text-2xl' : 'text-sm'
                                }`}>{section.title}</span>
                                <h2 className={`font-black tracking-tighter ${
                                    section.subtitleFontSize === 'small' ? 'text-3xl md:text-4xl' : section.subtitleFontSize === 'large' ? 'text-5xl md:text-7xl' : section.subtitleFontSize === 'xlarge' ? 'text-6xl md:text-8xl' : 'text-4xl md:text-6xl'
                                }`}>{section.subtitle}</h2>
                            </div>
                        )}
                        {section.type === 'promo' && (
                            <div className="p-8 flex flex-col items-center text-center border-y-4 border-dashed" style={{ borderColor: section.highlightColor || storefrontConfig.primaryColor }}>
                                <h3 className={`font-black uppercase mb-2 ${
                                    section.titleFontSize === 'small' ? 'text-2xl' : section.titleFontSize === 'large' ? 'text-4xl' : section.titleFontSize === 'xlarge' ? 'text-5xl' : 'text-3xl'
                                }`} style={{ color: section.highlightColor || storefrontConfig.primaryColor }}>{section.title}</h3>
                                <p className={`text-slate-500 font-medium ${
                                    section.subtitleFontSize === 'small' ? 'text-base' : section.subtitleFontSize === 'large' ? 'text-xl' : section.subtitleFontSize === 'xlarge' ? 'text-2xl' : 'text-lg'
                                }`}>{section.subtitle}</p>
                            </div>
                        )}
                        {section.type === 'products' && (
                            <div>
                                <h3 className="text-2xl font-bold text-slate-800 mb-6 flex items-center gap-3">
                                    <div className="w-1.5 h-8 rounded-full" style={{ backgroundColor: storefrontConfig.primaryColor }}></div>
                                    {section.title}
                                </h3>
                                
                                <div className={`grid gap-4 sm:gap-6 ${section.displayStyle === 'list' ? 'grid-cols-1 md:grid-cols-2' : 'grid-cols-2 md:grid-cols-4 lg:grid-cols-5'}`}>
                                    {section.productIds?.map((pid: string) => {
                                        const pr = products.find(p => p.id === pid && p.active !== false);
                                        if (!pr) return null;
                                        const qty = getQuantity(pr.id);
                                        const promo = getPromotionForProduct(pr);
                                        const effectivePrice = getEffectivePrice(pr, 1);
                                        return (
                                            <div key={pr.id} className={`bg-white rounded-2xl border-2 ${promo ? 'border-red-200' : 'border-slate-100'} p-4 hover:border-slate-300 hover:shadow-xl hover:-translate-y-1 transition-all group flex ${section.displayStyle === 'list' ? 'flex-row items-center gap-4' : 'flex-col'} relative h-full`}>
                                                <div className={`${section.displayStyle === 'list' ? 'w-24 h-24 mb-0' : 'h-40 mb-4'} relative flex items-center justify-center bg-slate-50 rounded-xl overflow-hidden group-hover:bg-slate-100 transition-colors`}>
                                                    {pr.imageUrl ? (
                                                        <img src={pr.imageUrl} alt={pr.name} className="max-h-full max-w-full object-contain p-2 mix-blend-multiply" />
                                                    ) : (
                                                        <Package className="w-10 h-10 text-slate-300"/>
                                                    )}
                                                    {promo && (
                                                        <div className="absolute top-2 left-2 bg-red-500 text-white text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider shadow-sm z-10 w-max">
                                                            {promo.type === 'percentage' ? `-${promo.value}%` : 'OFERTA'}
                                                        </div>
                                                    )}
                                                </div>
                                                
                                                <div className="flex-1 flex flex-col justify-between">
                                                    <div>
                                                        <h4 className={`font-bold text-slate-700 leading-tight mb-1 line-clamp-2 ${section.fontSize === 'large' ? 'text-lg' : section.fontSize === 'xlarge' ? 'text-xl' : section.fontSize === 'small' ? 'text-sm' : 'text-base'}`}>{pr.name}</h4>
                                                        <span className="text-xs text-slate-400 mb-2 block">{pr.ean ? `EAN: ${pr.ean}` : '1 unidade'}</span>
                                                    </div>
                                                    
                                                    <div className="mt-auto flex flex-col">
                                                        <div className="flex items-baseline gap-1 mb-2">
                                                            <span className={`text-xs font-bold ${promo ? 'text-red-500' : 'text-slate-400'}`}>R$</span>
                                                            <span className={`text-xl font-black tracking-tight ${promo ? 'text-red-600' : 'text-slate-800'}`}>{effectivePrice.toFixed(2)}</span>
                                                            {promo && <span className="text-xs text-slate-400 line-through ml-1 flex-1">R$ {pr.price.toFixed(2)}</span>}
                                                        </div>
                                                        
                                                        {qty === 0 ? (
                                                            <button 
                                                                onClick={() => toggleCartItem(pr, 1)}
                                                                className="w-full py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold flex items-center justify-center gap-2 transition-colors mt-auto border border-slate-200"
                                                            >
                                                                <Plus className="w-4 h-4"/> Adicionar
                                                            </button>
                                                        ) : (
                                                            <div className="w-full flex items-center justify-between text-white rounded-xl font-bold overflow-hidden mt-auto" style={{ backgroundColor: storefrontConfig.primaryColor }}>
                                                                <button onClick={() => toggleCartItem(pr, -1)} className="p-2.5 hover:bg-black/10 transition-colors"><Minus className="w-4 h-4"/></button>
                                                                <span className="px-2">{qty}</span>
                                                                <button onClick={() => toggleCartItem(pr, 1)} className="p-2.5 hover:bg-black/10 transition-colors"><Plus className="w-4 h-4"/></button>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        )}
                    </div>
                ))}
            </div>
        )}

        {/* Promo Banner Fallback */}
        {(!searchQuery && !selectedGondolaId && !storefrontConfig) && (
            <div className="mb-10 bg-gradient-to-r from-orange-500 to-red-500 rounded-3xl p-8 sm:p-12 text-white flex flex-col sm:flex-row items-center justify-between gap-6 shadow-lg shadow-orange-500/20">
                <div>
                    <span className="bg-white/20 px-3 py-1 rounded-full text-sm font-bold uppercase tracking-wider mb-4 inline-block backdrop-blur-sm">OFERTAS DO DIA</span>
                    <h2 className="text-3xl sm:text-5xl font-black tracking-tight leading-tight">Preços Inacreditáveis!</h2>
                    <p className="text-white/80 mt-2 font-medium">Aproveite os melhores descontos. Corre que acaba logo.</p>
                </div>
                <div className="bg-white/10 backdrop-blur-md border border-white/20 p-6 rounded-2xl flex flex-col items-center min-w-[200px]">
                    <Clock className="w-8 h-8 mb-2 opacity-80"/>
                    <span className="text-sm font-bold uppercase tracking-wider opacity-80">Termina em</span>
                    <span className="text-3xl font-mono font-bold mt-1">{formatTime(timeLeft)}</span>
                </div>
            </div>
        )}

        {/* Catalog Search / Default */}
        {(searchQuery || selectedGondolaId || !storefrontConfig) && (
        <div className={(!searchQuery && !selectedGondolaId && gondolaAppConfig) ? 'hidden sm:block' : 'block'}>
            <h3 className="text-xl font-bold text-slate-800 mb-6 flex items-center gap-2">
                {searchQuery ? `Procurando por "${searchQuery}"` : selectedGondolaId ? gondolas.find(g=>g.id===selectedGondolaId)?.name : 'Nossos Produtos'}
            </h3>
            
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 sm:gap-6">
                {filteredProducts.map(pr => {
                    const qty = getQuantity(pr.id);
                    const promo = getPromotionForProduct(pr);
                    const effectivePrice = getEffectivePrice(pr, 1);
                    return (
                        <div key={pr.id} className={`bg-white rounded-2xl border-2 ${promo ? 'border-red-200' : 'border-slate-100'} p-4 hover:border-slate-300 hover:shadow-xl hover:-translate-y-1 transition-all group flex flex-col relative h-full`}>
                            <div className="h-32 mb-4 relative flex items-center justify-center bg-slate-50 rounded-xl overflow-hidden group-hover:bg-slate-100 transition-colors">
                                {pr.imageUrl ? (
                                    <img src={pr.imageUrl} alt={pr.name} className="max-h-full max-w-full object-contain p-2 mix-blend-multiply" />
                                ) : (
                                    <Package className="w-10 h-10 text-slate-300"/>
                                )}
                                {promo && (
                                     <div className="absolute top-2 left-2 bg-red-500 text-white text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider shadow-sm z-10 w-max">
                                         {promo.type === 'percentage' ? `-${promo.value}%` : 'OFERTA'}
                                     </div>
                                )}
                            </div>
                            
                            <div className="flex-1 flex flex-col">
                                <h4 className="font-bold text-slate-700 leading-tight mb-1 line-clamp-2">{pr.name}</h4>
                                <span className="text-xs text-slate-400 mb-auto block">{pr.ean ? `EAN: ${pr.ean}` : '1 unidade'}</span>
                                
                                <div className="mt-3 flex flex-col">
                                    <div className="flex items-baseline gap-1 mb-2">
                                        <span className={`text-xs font-bold ${promo ? 'text-red-500' : 'text-slate-400'}`}>R$</span>
                                        <span className={`text-xl font-black tracking-tight ${promo ? 'text-red-600' : 'text-slate-800'}`}>{effectivePrice.toFixed(2)}</span>
                                        {promo && <span className="text-xs text-slate-400 line-through ml-1 flex-1">R$ {pr.price.toFixed(2)}</span>}
                                    </div>
                                    
                                    {qty === 0 ? (
                                        <button 
                                            onClick={() => toggleCartItem(pr, 1)}
                                            className="w-full py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold flex items-center justify-center gap-2 transition-colors mt-auto border border-slate-200"
                                        >
                                            <Plus className="w-4 h-4"/> Adicionar
                                        </button>
                                    ) : (
                                        <div className="w-full flex items-center justify-between bg-[#58CC02] text-white rounded-xl font-bold overflow-hidden mt-auto">
                                            <button onClick={() => toggleCartItem(pr, -1)} className="p-2.5 hover:bg-black/10 transition-colors"><Minus className="w-4 h-4"/></button>
                                            <span className="px-2">{qty}</span>
                                            <button onClick={() => toggleCartItem(pr, 1)} className="p-2.5 hover:bg-black/10 transition-colors"><Plus className="w-4 h-4"/></button>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>
            
            {filteredProducts.length === 0 && (
                <div className="text-center py-20">
                    <Search className="w-12 h-12 text-slate-300 mx-auto mb-4"/>
                    <h3 className="text-xl font-bold text-slate-600 mb-1">Nenhum produto encontrado</h3>
                    <p className="text-slate-400">Tente buscar por outro termo ou navegue nas categorias.</p>
                </div>
            )}
        </div>
        )}

        {/* Gondola App Layout (Mobile First) */}
        {!searchQuery && gondolaAppConfig && (
            <div className={`sm:hidden bg-white w-full rounded-3xl mt-4 pb-20 ${gondolaAppConfig.gondolaSpacing === 'tight' ? 'py-2' : gondolaAppConfig.gondolaSpacing === 'relaxed' ? 'py-8' : 'py-4'}`} style={{ backgroundColor: gondolaAppConfig.backgroundColor, color: gondolaAppConfig.textColor, margin: '-1rem -1rem 0 -1rem' }}>
                <div className="px-5 mb-4">
                     <h3 className="text-xl font-bold mb-2 flex items-center gap-2">
                         {selectedGondolaId ? gondolas.find(g=>g.id===selectedGondolaId)?.name : 'Categorias (Gôndolas)'}
                     </h3>
                </div>
                <div className="px-4 space-y-6">
                {(selectedGondolaId ? gondolas.filter(g=>g.id===selectedGondolaId) : gondolas).map((gondola) => {
                    const gondolaProducts = products.filter(p => p.gondolaId === gondola.id && p.active !== false);
                    if (gondolaProducts.length === 0) return null;
                    return (
                        <div key={gondola.id} className="relative z-0 bg-transparent rounded-2xl">
                            {!selectedGondolaId && <h2 className="font-bold mb-4 px-2" style={{ color: gondolaAppConfig.textColor, opacity: 0.8 }}>{gondola.name}</h2>}
                            
                            {/* Shelf Container */}
                            <div className="relative">
                                {/* Shelf Background Line */}
                                <div className="absolute bottom-0 left-0 right-0 h-4 rounded-full shadow-lg" style={{ backgroundColor: gondolaAppConfig.shelfColor }}></div>
                                
                                <div className="flex overflow-x-auto pb-6 pt-2 px-2 gap-4 snap-x">
                                    {gondolaProducts.map((pr) => {
                                        const qty = getQuantity(pr.id);
                                        const promo = getPromotionForProduct(pr);
                                        const effectivePrice = getEffectivePrice(pr, 1);
                                        return (
                                            <div key={pr.id} className="snap-center shrink-0 w-[120px] flex flex-col items-center group relative h-full">
                                                {/* Product Image Box */}
                                                <div className="h-28 w-28 rounded-xl bg-white p-2 shadow-sm border border-black/5 flex justify-center items-center relative overflow-hidden mb-3" onClick={() => qty === 0 ? toggleCartItem(pr, 1) : null}>
                                                    {pr.imageUrl ? (
                                                        <img src={pr.imageUrl} alt={pr.name} className="max-w-full max-h-full object-contain drop-shadow-sm" />
                                                    ) : (
                                                        <Package className="w-10 h-10 text-slate-300"/>
                                                    )}
                                                    {promo && (
                                                        <div className="absolute top-1 left-1 bg-red-500 text-white text-[8px] px-1.5 py-0.5 rounded-full font-bold uppercase tracking-wider shadow-sm z-10 w-max leading-none">
                                                            {promo.type === 'percentage' ? `-${promo.value}%` : 'OFERTA'}
                                                        </div>
                                                    )}
                                                    {qty > 0 && (
                                                         <div className="absolute top-1 right-1 bg-[#58CC02] text-white w-6 h-6 rounded-full flex items-center justify-center font-bold text-xs z-10 shadow">{qty}</div>
                                                    )}
                                                </div>

                                                {/* Label */}
                                                <div className="text-center w-full px-1 mb-2 h-10">
                                                    <h4 className="text-[11px] font-medium leading-tight line-clamp-2" style={{ color: gondolaAppConfig.textColor }}>{pr.name}</h4>
                                                </div>

                                                {/* Price Tag */}
                                                <div className="w-full mt-auto flex flex-col gap-2">
                                                    {promo && (
                                                        <div className="text-[9px] text-center line-through text-slate-400 mb-[-6px] opacity-70">
                                                            R$ {pr.price.toFixed(2)}
                                                        </div>
                                                    )}
                                                    {gondolaAppConfig.tagStyle === 'classic' ? (
                                                        <div className="bg-yellow-300 text-black px-2 py-1 rounded-sm border border-yellow-400 font-bold text-xs shadow-sm mt-auto relative rotate-[-2deg] text-center mx-auto w-11/12">
                                                            R$ {effectivePrice.toFixed(2)}
                                                        </div>
                                                    ) : gondolaAppConfig.tagStyle === 'minimal' ? (
                                                        <div className="font-bold text-sm mt-auto text-center" style={{ color: promo ? '#ef4444' : gondolaAppConfig.textColor }}>
                                                            <span className="text-[10px] opacity-70">R$</span> {effectivePrice.toFixed(2)}
                                                        </div>
                                                    ) : (
                                                        <div className={`bg-white px-3 py-1.5 rounded-full shadow border-b-2 border-slate-100 font-black text-xs mt-auto whitespace-nowrap text-center mx-auto ${promo ? 'text-red-500' : 'text-blue-600'}`}>
                                                            R$ {effectivePrice.toFixed(2)}
                                                        </div>
                                                    )}
                                                    
                                                    {/* App action button */}
                                                    <div className="flex gap-1 justify-center mt-1">
                                                        {qty === 0 ? (
                                                            <button onClick={() => toggleCartItem(pr, 1)} className="bg-black/5 hover:bg-black/10 rounded-full w-8 h-8 flex items-center justify-center transition-colors">
                                                                <Plus className="w-4 h-4"/>
                                                            </button>
                                                        ) : (
                                                            <>
                                                                <button onClick={() => toggleCartItem(pr, -1)} className="bg-red-100 text-red-600 rounded-full w-8 h-8 flex items-center justify-center transition-colors">
                                                                    <Minus className="w-4 h-4"/>
                                                                </button>
                                                                <button onClick={() => toggleCartItem(pr, 1)} className="bg-[#58CC02]/20 text-[#58CC02] rounded-full w-8 h-8 flex items-center justify-center transition-colors">
                                                                    <Plus className="w-4 h-4"/>
                                                                </button>
                                                            </>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>
                    );
                })}
                </div>
            </div>
        )}

      </main>

      {/* Floating Footer Cart (Mobile only) */}
      {cart.length > 0 && (
          <div className="fixed bottom-0 left-0 right-0 sm:hidden z-40 p-4">
              <button 
                  onClick={() => setIsCartOpen(true)}
                  className="w-full bg-[#58CC02] text-white p-4 rounded-2xl shadow-xl font-bold flex items-center justify-between"
              >
                  <div className="flex items-center gap-3">
                      <div className="bg-white/20 w-8 h-8 rounded-full flex items-center justify-center text-sm">{cart.reduce((a,b)=>a+b.quantity, 0)}</div>
                      <span>Ver Carrinho</span>
                  </div>
                  <span>R$ {cartTotal.toFixed(2)}</span>
              </button>
          </div>
      )}

      {/* Cart Sidebar */}
      {isCartOpen && (
          <div className="fixed inset-0 z-50 flex justify-end">
              <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => setIsCartOpen(false)}></div>
              <div className="relative w-full max-w-md bg-white h-full shadow-2xl flex flex-col animate-in slide-in-from-right duration-300">
                  <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50">
                      <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                          <ShoppingCart className="w-5 h-5"/> Seu Carrinho
                      </h2>
                      <button onClick={() => setIsCartOpen(false)} className="p-2 text-slate-400 hover:bg-slate-200 rounded-full transition-colors"><X className="w-5 h-5"/></button>
                  </div>
                  
                  <div className="flex-1 overflow-y-auto p-6 space-y-4">
                      {cart.length === 0 ? (
                          <div className="text-center py-12 text-slate-400">
                              <ShoppingBag className="w-16 h-16 mx-auto mb-4 opacity-50"/>
                              <p className="font-bold text-lg">Seu carrinho está vazio</p>
                              <p className="text-sm mt-1">Adicione produtos para continuar.</p>
                              <button onClick={() => setIsCartOpen(false)} className="mt-6 px-6 py-2 bg-slate-100 text-slate-700 font-bold rounded-full hover:bg-slate-200">Voltar às compras</button>
                          </div>
                      ) : (
                          cart.map((item) => (
                              <div key={item.product.id} className="flex gap-4 py-4 border-b border-slate-100 last:border-0">
                                  <div className="w-16 h-16 bg-slate-50 rounded-xl overflow-hidden border border-slate-200 flex-shrink-0 flex items-center justify-center">
                                      {item.product.imageUrl ? (
                                          <img src={item.product.imageUrl} className="max-w-full max-h-full object-contain p-1 mix-blend-multiply"/>
                                      ) : (
                                          <Package className="w-6 h-6 text-slate-300"/>
                                      )}
                                  </div>
                                  <div className="flex-1 flex flex-col justify-between">
                                      <div className="flex justify-between items-start gap-2">
                                          <h4 className="font-bold text-slate-700 text-sm line-clamp-2">{item.product.name}</h4>
                                          <span className="font-black text-slate-800 whitespace-nowrap">R$ {(item.product.price * item.quantity).toFixed(2)}</span>
                                      </div>
                                      <div className="flex items-center gap-3">
                                          <div className="flex items-center bg-slate-100 rounded-lg overflow-hidden border border-slate-200">
                                              <button onClick={() => toggleCartItem(item.product, -1)} className="p-1.5 text-slate-500 hover:bg-slate-200"><Minus className="w-3.5 h-3.5"/></button>
                                              <span className="px-3 font-bold text-sm text-slate-700">{item.quantity}</span>
                                              <button onClick={() => toggleCartItem(item.product, 1)} className="p-1.5 text-slate-500 hover:bg-slate-200"><Plus className="w-3.5 h-3.5"/></button>
                                          </div>
                                      </div>
                                  </div>
                              </div>
                          ))
                      )}
                  </div>
                  
                  {cart.length > 0 && (
                      <div className="p-6 bg-slate-50 border-t border-slate-200">
                          <div className="flex items-center justify-between mb-4 font-bold text-slate-600">
                              <span>Total da compra</span>
                              <span className="text-2xl font-black text-slate-800">R$ {cartTotal.toFixed(2)}</span>
                          </div>
                          <button 
                             onClick={async () => {
                                 try {
                                     const pId = Math.random().toString(36).substring(2, 9);
                                     const items = cart.map(i => ({ 
                                         productId: i.product.id, 
                                         name: i.product.name, 
                                         quantity: i.quantity, 
                                         price: i.product.price,
                                         separated: false,
                                         missing: false
                                     }));
                                     // Using the user-facing firebase hook, so throwing an error might be useful, but let's just do standard setDoc.
                                     const { setDoc, serverTimestamp } = await import('firebase/firestore');
                                     await setDoc(doc(db, `supermarkets/${smId}/orders`, pId), {
                                         supermarketId: smId,
                                         customerId: `CLI-${Math.floor(Math.random()*1000)}`,
                                         status: 'pending',
                                         items: items,
                                         total: cartTotal,
                                         createdAt: serverTimestamp(),
                                         updatedAt: serverTimestamp()
                                     });
                                     alert('Pedido enviado com sucesso! Aguarde a separação.');
                                     setCart([]);
                                     setIsCartOpen(false);
                                 } catch(e) {
                                     alert('Erro ao criar pedido.');
                                     console.error(e);
                                 }
                             }}
                             className="w-full bg-[#58CC02] hover:bg-[#4ba802] text-white py-4 rounded-xl font-bold text-lg transition-colors shadow-lg shadow-[#58CC02]/20"
                          >
                              Finalizar Pedido
                          </button>
                      </div>
                  )}
              </div>
          </div>
      )}
    </div>
  );
}
