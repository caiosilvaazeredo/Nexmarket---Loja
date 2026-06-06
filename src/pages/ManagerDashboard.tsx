import React, { useEffect, useState, useRef } from 'react';
import { collection, query, onSnapshot, doc, setDoc, updateDoc, deleteDoc, serverTimestamp, writeBatch } from 'firebase/firestore';
import { ref, uploadBytesResumable, getDownloadURL, UploadTask } from 'firebase/storage';
import { db, handleFirestoreError, OperationType, auth, storage } from '../lib/firebase';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Plus, Store, Layers, Package, Trash2, Edit3, GripVertical, Search, X, Upload, ShoppingCart, ListChecks, Tags, Smartphone, LogOut, HelpCircle, Truck, BarChart3, PackageX, Settings, Users, Megaphone, Star, Menu } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';
import { GONDOLA_ICONS } from '../lib/gondolaIcons';

const generateId = () => Math.random().toString(36).substring(2, 9);

type ManagerView = 'home' | 'shelves' | 'catalog' | 'orders' | 'gondolaApp' | 'promotions' | 'delivery' | 'analytics' | 'inventory' | 'settings' | 'staff' | 'marketing' | 'reviews';

import CatalogManager from '../components/manager/CatalogManager';
import OrderPicker from '../components/manager/OrderPicker';
import StorefrontBuilder from '../components/manager/StorefrontBuilder';
import GondolaAppBuilder from '../components/manager/GondolaAppBuilder';
import PromotionsManager from '../components/manager/PromotionsManager';
import DeliveryConfigManager from '../components/manager/DeliveryConfigManager';
import AnalyticsManager from '../components/manager/AnalyticsManager';
import InventoryManager from '../components/manager/InventoryManager';
import StoreSettingsManager from '../components/manager/StoreSettingsManager';
import StaffManager from '../components/manager/StaffManager';
import MarketingManager from '../components/manager/MarketingManager';
import ReviewsManager from '../components/manager/ReviewsManager';

export default function ManagerDashboard() {
  const navigate = useNavigate();
  const [supermarkets, setSupermarkets] = useState<any[]>([]);
  const [gondolas, setGondolas] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [promotions, setPromotions] = useState<any[]>([]);
  
  const [selectedSmId, setSelectedSmId] = useState<string | null>(null);
  const [selectedGdId, setSelectedGdId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [managerView, setManagerView] = useState<ManagerView>('home');
  const [showTutorial, setShowTutorial] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Modals state
  const [isSmModalOpen, setSmModalOpen] = useState(false);
  const [smFormData, setSmFormData] = useState({ name: '', themeColor: '#58CC02', logoUrl: '' });
  const [editingSmId, setEditingSmId] = useState<string | null>(null);

  const [isGdModalOpen, setGdModalOpen] = useState(false);
  const [gdFormData, setGdFormData] = useState({ name: '', iconName: 'shoppingBag', colorTheme: '#58CC02' });
  const [editingGdId, setEditingGdId] = useState<string | null>(null);

  const [isPrModalOpen, setPrModalOpen] = useState(false);
  const [prFormData, setPrFormData] = useState({ name: '', price: 0, imageUrl: '', gondolaId: '', subcategory: '', trackInventory: false, stockQuantity: 0, alertQuantity: 10, criticalQuantity: 5 });
  const [editingPrId, setEditingPrId] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const uploadTaskRef = useRef<UploadTask | null>(null);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>, callback: (url: string) => void) => {
      const file = e.target.files?.[0];
      if (!file) return;
      setIsUploading(true);
      setUploadProgress(10);
      
      const reader = new FileReader();
      reader.onload = (event) => {
          setUploadProgress(40);
          const img = new Image();
          img.onload = () => {
              setUploadProgress(60);
              const canvas = document.createElement('canvas');
              const MAX_WIDTH = 400;
              const MAX_HEIGHT = 400;
              let width = img.width;
              let height = img.height;

              if (width > height) {
                  if (width > MAX_WIDTH) {
                      height *= MAX_WIDTH / width;
                      width = MAX_WIDTH;
                  }
              } else {
                  if (height > MAX_HEIGHT) {
                      width *= MAX_HEIGHT / height;
                      height = MAX_HEIGHT;
                  }
              }

              canvas.width = width;
              canvas.height = height;
              const ctx = canvas.getContext('2d');
              
              if (ctx) {
                  // Preencher com branco para evitar fundo preto em PNGs convertidos para JPEG
                  if (file.type !== 'image/png' && file.type !== 'image/webp') {
                      ctx.fillStyle = '#FFFFFF';
                      ctx.fillRect(0, 0, width, height);
                  }
                  ctx.drawImage(img, 0, 0, width, height);
              }
              
              setUploadProgress(80);
              const mimeType = file.type === 'image/png' ? 'image/png' : 'image/jpeg';
              const quality = mimeType === 'image/jpeg' ? 0.8 : undefined;
              const dataUrl = canvas.toDataURL(mimeType, quality);
              
              setUploadProgress(100);
              setTimeout(() => {
                  callback(dataUrl);
                  setIsUploading(false);
                  setUploadProgress(0);
              }, 300);
          };
          img.onerror = () => {
              alert("Erro ao processar imagem");
              setIsUploading(false);
              setUploadProgress(0);
          };
          img.src = event.target?.result as string;
      };
      reader.onerror = () => {
          alert("Falha ao ler o arquivo selecionado");
          setIsUploading(false);
          setUploadProgress(0);
      };
      reader.readAsDataURL(file);
  };

  const cancelUpload = () => {
      // FileReader is so fast that cancelling is simply resetting the state.
      setIsUploading(false);
      setUploadProgress(0);
  };

  useEffect(() => {
    if (!auth.currentUser) return;
    const q = query(collection(db, 'supermarkets'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data: any[] = [];
      snapshot.forEach((doc) => {
        if (doc.data().ownerId === auth.currentUser?.uid) {
            data.push({ id: doc.id, ...doc.data() });
        }
      });
      setSupermarkets(data);
    }, (error) => handleFirestoreError(error, OperationType.LIST, 'supermarkets'));
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!selectedSmId) {
        setGondolas([]);
        return;
    }
    const q = query(collection(db, `supermarkets/${selectedSmId}/gondolas`));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data: any[] = [];
      snapshot.forEach((doc) => {
        data.push({ id: doc.id, ...doc.data() });
      });
      setGondolas(data.sort((a,b) => a.order - b.order));
    }, (error) => handleFirestoreError(error, OperationType.LIST, `supermarkets/${selectedSmId}/gondolas`));
    return () => unsubscribe();
  }, [selectedSmId]);

  useEffect(() => {
    if (!selectedSmId) {
        setProducts([]);
        setPromotions([]);
        return;
    }
    const qProducts = query(collection(db, `supermarkets/${selectedSmId}/products`));
    const unsubscribeProducts = onSnapshot(qProducts, (snapshot) => {
      const data: any[] = [];
      snapshot.forEach((doc) => {
        data.push({ id: doc.id, ...doc.data() });
      });
      setProducts(data.sort((a,b) => (a.order || 0) - (b.order || 0)));
    }, (error) => handleFirestoreError(error, OperationType.LIST, `supermarkets/${selectedSmId}/products`));

    const qPromos = query(collection(db, `supermarkets/${selectedSmId}/promotions`));
    const unsubscribePromos = onSnapshot(qPromos, (snapshot) => {
      const data: any[] = [];
      snapshot.forEach((doc) => {
        data.push({ id: doc.id, ...doc.data() });
      });
      setPromotions(data);
    }, (error) => handleFirestoreError(error, OperationType.LIST, `supermarkets/${selectedSmId}/promotions`));

    return () => {
        unsubscribeProducts();
        unsubscribePromos();
    };
  }, [selectedSmId]);

  // Handle Supermarket
  const openSmModal = (sm: any = null) => {
      if (sm) {
          setEditingSmId(sm.id);
          setSmFormData({ name: sm.name, themeColor: sm.themeColor, logoUrl: sm.logoUrl || '' });
      } else {
          setEditingSmId(null);
          setSmFormData({ name: '', themeColor: '#58CC02', logoUrl: '' });
      }
      setSmModalOpen(true);
  };

  const saveSupermarket = async () => {
      if (!smFormData.name) return;
      try {
          if (editingSmId) {
              await updateDoc(doc(db, 'supermarkets', editingSmId), {
                  name: smFormData.name,
                  themeColor: smFormData.themeColor,
                  logoUrl: smFormData.logoUrl,
                  updatedAt: serverTimestamp()
              });
          } else {
              const id = generateId();
              await setDoc(doc(db, 'supermarkets', id), {
                  name: smFormData.name,
                  ownerId: auth.currentUser?.uid,
                  themeColor: smFormData.themeColor,
                  logoUrl: smFormData.logoUrl,
                  createdAt: serverTimestamp(),
                  updatedAt: serverTimestamp()
              });
              alert('Mercado criado com sucesso!');
          }
          setSmModalOpen(false);
      } catch (error) {
          handleFirestoreError(error, editingSmId ? OperationType.UPDATE : OperationType.CREATE, `supermarkets`);
      }
  };

  // Handle Gondola
  const openGdModal = (gd: any = null) => {
      if (gd) {
          setEditingGdId(gd.id);
          setGdFormData({ name: gd.name, iconName: gd.iconName, colorTheme: gd.colorTheme || '#58CC02' });
      } else {
          setEditingGdId(null);
          setGdFormData({ name: '', iconName: 'shoppingBag', colorTheme: '#58CC02' });
      }
      setGdModalOpen(true);
  };

  const saveGondola = async () => {
      if (!gdFormData.name || !selectedSmId) return;
      try {
          if (editingGdId) {
              await updateDoc(doc(db, `supermarkets/${selectedSmId}/gondolas`, editingGdId), {
                  name: gdFormData.name,
                  iconName: gdFormData.iconName,
                  colorTheme: gdFormData.colorTheme,
                  updatedAt: serverTimestamp()
              });
          } else {
              const id = generateId();
              await setDoc(doc(db, `supermarkets/${selectedSmId}/gondolas`, id), {
                  supermarketId: selectedSmId,
                  name: gdFormData.name,
                  iconName: gdFormData.iconName,
                  colorTheme: gdFormData.colorTheme,
                  order: gondolas.length,
                  createdAt: serverTimestamp(),
                  updatedAt: serverTimestamp()
              });
          }
          setGdModalOpen(false);
      } catch (error) {
          handleFirestoreError(error, editingGdId ? OperationType.UPDATE : OperationType.CREATE, `supermarkets/${selectedSmId}/gondolas`);
      }
  };

  const handleDragEndGondolas = async (result: DropResult) => {
    if (!result.destination || !selectedSmId) return;
    const items = [...gondolas];
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);

    setGondolas(items); // Optimistic UI update

    const batch = writeBatch(db);
    items.forEach((item: any, index) => {
        if (item.order !== index) {
            batch.update(doc(db, `supermarkets/${selectedSmId}/gondolas`, item.id), { order: index, updatedAt: serverTimestamp() });
        }
    });
    try {
        await batch.commit();
    } catch(err) {
        handleFirestoreError(err, OperationType.UPDATE, `supermarkets/${selectedSmId}/gondolas`);
    }
  };

  // Handle Product
  const openPrModal = (pr: any = null, prefilledGondolaId: string | null = null) => {
      if (pr) {
          setEditingPrId(pr.id);
          setPrFormData({ 
              name: pr.name, 
              price: pr.price, 
              imageUrl: pr.imageUrl, 
              gondolaId: pr.gondolaId, 
              subcategory: pr.subcategory || '',
              trackInventory: pr.trackInventory || false,
              stockQuantity: pr.stockQuantity || 0,
              alertQuantity: pr.alertQuantity || 10,
              criticalQuantity: pr.criticalQuantity || 5
          });
      } else {
          setEditingPrId(null);
          setPrFormData({ name: '', price: 0, imageUrl: '', gondolaId: prefilledGondolaId || selectedGdId || (gondolas.length > 0 ? gondolas[0].id : ''), subcategory: '', trackInventory: false, stockQuantity: 0, alertQuantity: 10, criticalQuantity: 5 });
      }
      setPrModalOpen(true);
  };

  const saveProduct = async () => {
      if (!prFormData.name || !selectedSmId || !prFormData.gondolaId) return;
      try {
          if (editingPrId) {
              const currentProduct = products.find(p => p.id === editingPrId);
              await updateDoc(doc(db, `supermarkets/${selectedSmId}/products`, editingPrId), {
                  name: prFormData.name,
                  price: Number(prFormData.price),
                  imageUrl: prFormData.imageUrl,
                  gondolaId: prFormData.gondolaId,
                  subcategory: prFormData.subcategory,
                  trackInventory: prFormData.trackInventory,
                  stockQuantity: Number(prFormData.stockQuantity),
                  alertQuantity: Number(prFormData.alertQuantity),
                  criticalQuantity: Number(prFormData.criticalQuantity),
                  order: currentProduct?.order || 0,
                  updatedAt: serverTimestamp()
              });
          } else {
              const id = generateId();
              const productsInGondola = products.filter(p => p.gondolaId === prFormData.gondolaId);
              await setDoc(doc(db, `supermarkets/${selectedSmId}/products`, id), {
                  supermarketId: selectedSmId,
                  gondolaId: prFormData.gondolaId,
                  subcategory: prFormData.subcategory,
                  name: prFormData.name,
                  price: Number(prFormData.price),
                  imageUrl: prFormData.imageUrl,
                  trackInventory: prFormData.trackInventory,
                  stockQuantity: Number(prFormData.stockQuantity),
                  alertQuantity: Number(prFormData.alertQuantity),
                  criticalQuantity: Number(prFormData.criticalQuantity),
                  order: productsInGondola.length,
                  active: true,
                  ean: '',
                  createdAt: serverTimestamp(),
                  updatedAt: serverTimestamp()
              });
          }
          setPrModalOpen(false);
      } catch (error) {
          handleFirestoreError(error, editingPrId ? OperationType.UPDATE : OperationType.CREATE, `supermarkets/${selectedSmId}/products`);
      }
  };

  const handleDragEndProducts = async (result: DropResult) => {
    const { source, destination } = result;
    if (!destination || !selectedSmId) return;
    
    // block dnd when searching
    if (searchQuery.trim() !== '') return; 
    
    const sourceGondolaId = source.droppableId;
    const destGondolaId = destination.droppableId;

    if (sourceGondolaId === destGondolaId) {
        // Same gondola
        const items = products.filter(pr => pr.gondolaId === sourceGondolaId);
        items.sort((a,b) => (a.order || 0) - (b.order || 0));

        const [reorderedItem] = items.splice(source.index, 1);
        items.splice(destination.index, 0, reorderedItem);

        // Optimistic UI updates
        const newProducts = [...products];
        items.forEach((item, index) => {
            const prod = newProducts.find(p => p.id === item.id);
            if (prod) prod.order = index;
        });
        setProducts(newProducts);

        const batch = writeBatch(db);
        items.forEach((item, index) => {
            batch.update(doc(db, `supermarkets/${selectedSmId}/products`, item.id), { order: index, updatedAt: serverTimestamp() });
        });
        try {
            await batch.commit();
        } catch(err) {
            handleFirestoreError(err, OperationType.UPDATE, `supermarkets/${selectedSmId}/products`);
        }
    } else {
        // Different gondolas
        const sourceItems = products.filter(pr => pr.gondolaId === sourceGondolaId);
        sourceItems.sort((a,b) => (a.order || 0) - (b.order || 0));
        
        const destItems = products.filter(pr => pr.gondolaId === destGondolaId);
        destItems.sort((a,b) => (a.order || 0) - (b.order || 0));

        const [movedItem] = sourceItems.splice(source.index, 1);
        movedItem.gondolaId = destGondolaId;
        destItems.splice(destination.index, 0, movedItem);

        const newProducts = [...products];
        sourceItems.forEach((item, index) => {
            const prod = newProducts.find(p => p.id === item.id);
            if (prod) prod.order = index;
        });
        destItems.forEach((item, index) => {
            const prod = newProducts.find(p => p.id === item.id);
            if (prod) {
                 prod.order = index;
                 prod.gondolaId = destGondolaId;
            }
        });
        setProducts(newProducts);

        const batch = writeBatch(db);
        sourceItems.forEach((item, index) => {
            batch.update(doc(db, `supermarkets/${selectedSmId}/products`, item.id), { order: index, updatedAt: serverTimestamp() });
        });
        destItems.forEach((item, index) => {
            batch.update(doc(db, `supermarkets/${selectedSmId}/products`, item.id), { order: index, gondolaId: destGondolaId, updatedAt: serverTimestamp() });
        });
        try {
            await batch.commit();
        } catch(err) {
            handleFirestoreError(err, OperationType.UPDATE, `supermarkets/${selectedSmId}/products`);
        }
    }
  };

  const handleDelete = async (path: string) => {
      if (!confirm('Tem certeza?')) return;
      try {
          await deleteDoc(doc(db, path));
      } catch (error) {
          handleFirestoreError(error, OperationType.DELETE, path);
      }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex">
      {isSidebarOpen && (
        <div className="fixed inset-0 bg-black/50 z-30 md:hidden" onClick={() => setIsSidebarOpen(false)} />
      )}
      
      {/* Sidebar */}
      <div className={`fixed inset-y-0 left-0 z-40 bg-white border-r-2 border-slate-100 flex flex-col h-screen transform transition-transform duration-300 md:relative md:translate-x-0 w-80 ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="p-4 border-b-2 border-slate-100 flex items-center justify-between">
            <div className="flex items-center gap-4">
                <button onClick={() => auth.signOut()} className="p-2 text-slate-400 hover:bg-red-50 hover:text-red-500 rounded-xl" title="Sair">
                    <LogOut className="w-5 h-5" />
                </button>
                <h1 className="font-bold text-slate-800">Nexmarket</h1>
            </div>
            <button className="md:hidden p-2 text-slate-400 hover:bg-slate-100 rounded-lg" onClick={() => setIsSidebarOpen(false)}>
                <X className="w-5 h-5" />
            </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-6">
            {/* Supermarkets */}
            <div className="space-y-2">
                <div className="flex items-center justify-between">
                    <h2 className="text-sm font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2"><Store className="w-4 h-4"/> Meus Mercados</h2>
                    <button onClick={() => openSmModal()} className="p-1 bg-[#58CC02]/10 text-[#58CC02] rounded-lg hover:bg-[#58CC02]/20"><Plus className="w-4 h-4"/></button>
                </div>
                {supermarkets.map(sm => (
                    <div 
                        key={sm.id} 
                        onClick={() => { setSelectedSmId(sm.id); setSelectedGdId(null); setManagerView('home'); setIsSidebarOpen(false); }}
                        className={`p-3 rounded-xl border-2 cursor-pointer transition-all ${selectedSmId === sm.id ? 'border-[#58CC02] bg-[#58CC02]/5' : 'border-transparent hover:border-slate-200 hover:bg-slate-50'}`}
                    >
                        <div className="flex justify-between items-center">
                          <div className="flex items-center gap-3">
                              {sm.logoUrl ? (
                                  <img src={sm.logoUrl} alt="Logo" className="w-8 h-8 rounded-lg object-contain bg-white border border-slate-200" />
                              ) : (
                                  <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-600 flex items-center justify-center"><Store className="w-4 h-4"/></div>
                              )}
                              <span className="font-bold text-slate-700">{sm.name}</span>
                          </div>
                          {selectedSmId === sm.id && (
                              <div className="flex gap-2">
                                  <button onClick={(e) => { e.stopPropagation(); openSmModal(sm); }} className="text-blue-400 hover:text-blue-600"><Edit3 className="w-4 h-4" /></button>
                                  <button onClick={(e) => { e.stopPropagation(); handleDelete(`supermarkets/${sm.id}`); }} className="text-red-400 hover:text-red-600"><Trash2 className="w-4 h-4" /></button>
                              </div>
                          )}
                        </div>
                    </div>
                ))}
            </div>

            {/* Sub-menu (Only show when not in home, or just always show when selected) */}
            {selectedSmId && (
                <div className="space-y-4 pt-4 border-t-2 border-slate-100/50">
                    <button 
                        onClick={() => { setManagerView('home'); setIsSidebarOpen(false); }} 
                        className={`w-full flex items-center gap-3 p-3 rounded-xl border-2 font-bold transition-all ${managerView === 'home' ? 'border-indigo-500 bg-indigo-50 text-indigo-700' : 'border-transparent text-slate-600 hover:bg-slate-50'}`}
                    >
                        <Store className="w-5 h-5"/> Visão Geral
                    </button>
                    
                    <div className="space-y-1">
                        <h2 className="text-xs font-bold text-slate-400 uppercase tracking-wider px-3 mb-2">Ferramentas</h2>
                        <button 
                            onClick={() => { setManagerView('shelves'); setIsSidebarOpen(false); }} 
                            className={`w-full flex items-center gap-3 p-3 rounded-xl font-bold transition-all ${managerView === 'shelves' ? 'bg-blue-50 text-blue-700' : 'text-slate-600 hover:bg-slate-50'}`}
                        >
                            <Layers className="w-5 h-5"/> Organizar Prateleiras
                        </button>
                        <button 
                            onClick={() => { setManagerView('catalog'); setIsSidebarOpen(false); }} 
                            className={`w-full flex items-center gap-3 p-3 rounded-xl font-bold transition-all ${managerView === 'catalog' ? 'bg-orange-50 text-orange-700' : 'text-slate-600 hover:bg-slate-50'}`}
                        >
                            <Tags className="w-5 h-5"/> Gestão de Catálogo
                        </button>
                        <button 
                            onClick={() => { setManagerView('promotions'); setIsSidebarOpen(false); }} 
                            className={`w-full flex items-center gap-3 p-3 rounded-xl font-bold transition-all ${managerView === 'promotions' ? 'bg-red-50 text-red-700' : 'text-slate-600 hover:bg-slate-50'}`}
                        >
                            <Tags className="w-5 h-5"/> Promoções
                        </button>
                        <button 
                            onClick={() => { setManagerView('delivery'); setIsSidebarOpen(false); }} 
                            className={`w-full flex items-center gap-3 p-3 rounded-xl font-bold transition-all ${managerView === 'delivery' ? 'bg-indigo-50 text-indigo-700' : 'text-slate-600 hover:bg-slate-50'}`}
                        >
                            <Truck className="w-5 h-5"/> Configurar Entrega
                        </button>
                        <button 
                            onClick={() => { setManagerView('analytics'); setIsSidebarOpen(false); }} 
                            className={`w-full flex items-center gap-3 p-3 rounded-xl font-bold transition-all ${managerView === 'analytics' ? 'bg-teal-50 text-teal-700' : 'text-slate-600 hover:bg-slate-50'}`}
                        >
                            <BarChart3 className="w-5 h-5"/> Relatórios
                        </button>
                        <button 
                            onClick={() => { setManagerView('inventory'); setIsSidebarOpen(false); }} 
                            className={`w-full flex items-center gap-3 p-3 rounded-xl font-bold transition-all ${managerView === 'inventory' ? 'bg-amber-50 text-amber-700' : 'text-slate-600 hover:bg-slate-50'}`}
                        >
                            <PackageX className="w-5 h-5"/> Estoque
                        </button>
                        <button 
                            onClick={() => { setManagerView('settings'); setIsSidebarOpen(false); }} 
                            className={`w-full flex items-center gap-3 p-3 rounded-xl font-bold transition-all ${managerView === 'settings' ? 'bg-blue-50 text-blue-700' : 'text-slate-600 hover:bg-slate-50'}`}
                        >
                            <Settings className="w-5 h-5"/> Configurações
                        </button>
                        <button 
                            onClick={() => { setManagerView('staff'); setIsSidebarOpen(false); }} 
                            className={`w-full flex items-center gap-3 p-3 rounded-xl font-bold transition-all ${managerView === 'staff' ? 'bg-pink-50 text-pink-700' : 'text-slate-600 hover:bg-slate-50'}`}
                        >
                            <Users className="w-5 h-5"/> Equipe
                        </button>
                        <button 
                            onClick={() => { setManagerView('marketing'); setIsSidebarOpen(false); }} 
                            className={`w-full flex items-center gap-3 p-3 rounded-xl font-bold transition-all ${managerView === 'marketing' ? 'bg-rose-50 text-rose-700' : 'text-slate-600 hover:bg-slate-50'}`}
                        >
                            <Megaphone className="w-5 h-5"/> Marketing
                        </button>
                        <button 
                            onClick={() => { setManagerView('reviews'); setIsSidebarOpen(false); }} 
                            className={`w-full flex items-center gap-3 p-3 rounded-xl font-bold transition-all ${managerView === 'reviews' ? 'bg-yellow-50 text-yellow-700' : 'text-slate-600 hover:bg-slate-50'}`}
                        >
                            <Star className="w-5 h-5"/> Avaliações
                        </button>
                        <button 
                            onClick={() => { setManagerView('orders'); setIsSidebarOpen(false); }} 
                            className={`w-full flex items-center gap-3 p-3 rounded-xl font-bold transition-all ${managerView === 'orders' ? 'bg-green-50 text-green-700' : 'text-slate-600 hover:bg-slate-50'}`}
                        >
                            <ListChecks className="w-5 h-5"/> Separação de Pedidos
                        </button>
                        <button 
                            onClick={isMobile ? () => alert('Funcionalidade disponível apenas no Computador') : () => { setManagerView('gondolaApp'); setIsSidebarOpen(false); }} 
                            title={isMobile ? 'Funcionalidade disponível apenas no Computador' : undefined}
                            className={`w-full flex items-center gap-3 p-3 rounded-xl font-bold transition-all ${isMobile ? 'opacity-50 cursor-not-allowed' : ''} ${managerView === 'gondolaApp' ? 'bg-indigo-50 text-indigo-700' : 'text-slate-600 hover:bg-slate-50'}`}
                        >
                            <Smartphone className="w-5 h-5"/> Configurar Visual do App (Gôndolas)
                        </button>
                    </div>

                    {/* Gondolas list only shows when organizing shelves */}
                    {managerView === 'shelves' && (
                        <div className="space-y-2 pt-4 border-t-2 border-slate-100/50">
                            <div className="flex items-center justify-between mb-2">
                                <h2 className="text-sm font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2"><Layers className="w-4 h-4"/> Prateleiras (Gôndolas)</h2>
                                <button onClick={() => openGdModal()} className="p-1 bg-blue-500/10 text-blue-500 rounded-lg hover:bg-blue-500/20"><Plus className="w-4 h-4"/></button>
                            </div>
                            
                            <div 
                                onClick={() => setSelectedGdId(null)}
                                className={`p-3 rounded-xl border-2 cursor-pointer flex justify-between items-center transition-all ${selectedGdId === null ? 'border-blue-500 bg-blue-50' : 'border-transparent hover:border-slate-200 hover:bg-slate-50'}`}
                            >
                                <div className="flex items-center gap-3 w-full">
                                    <Layers className={`w-5 h-5 ${selectedGdId === null ? 'text-blue-500' : 'text-slate-400'}`} />
                                    <span className="font-bold text-slate-700">Todas as Prateleiras</span>
                                </div>
                            </div>

                            <DragDropContext onDragEnd={handleDragEndGondolas}>
                                <Droppable droppableId="gondolas-list">
                                    {(provided) => (
                                        <div {...provided.droppableProps} ref={provided.innerRef} className="space-y-2">
                                            {gondolas.map((gd, index) => {
                                                const DynamicDraggable = Draggable as any;
                                                return (
                                                <DynamicDraggable key={gd.id} draggableId={gd.id} index={index}>
                                                    {(provided: any) => (
                                                        <div 
                                                            ref={provided.innerRef}
                                                            {...provided.draggableProps}
                                                            onClick={() => setSelectedGdId(gd.id)}
                                                            className={`p-3 rounded-xl border-2 cursor-pointer flex justify-between items-center transition-all ${selectedGdId === gd.id ? 'border-blue-500 bg-blue-50' : 'border-slate-200 bg-white hover:bg-slate-50'}`}
                                                        >
                                                            <div className="flex items-center gap-2">
                                                                <div {...provided.dragHandleProps} className="text-slate-300 hover:text-slate-500 cursor-grab">
                                                                    <GripVertical className="w-4 h-4" />
                                                                </div>
                                                                <span className="font-bold text-slate-700">{gd.name}</span>
                                                            </div>
                                                            {selectedGdId === gd.id && (
                                                                <div className="flex gap-2">
                                                                    <button onClick={(e) => { e.stopPropagation(); openGdModal(gd); }} className="text-blue-500 hover:text-blue-700"><Edit3 className="w-4 h-4" /></button>
                                                                    <button onClick={(e) => { e.stopPropagation(); handleDelete(`supermarkets/${selectedSmId}/gondolas/${gd.id}`); }} className="text-red-400 hover:text-red-600"><Trash2 className="w-4 h-4" /></button>
                                                                </div>
                                                            )}
                                                        </div>
                                                    )}
                                                </DynamicDraggable>
                                            )})}
                                            {provided.placeholder}
                                        </div>
                                    )}
                                </Droppable>
                            </DragDropContext>
                        </div>
                    )}
                </div>
            )}
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto w-full bg-slate-50 relative">
        <div className="md:hidden sticky top-0 bg-white border-b border-slate-200 z-10 p-3 flex items-center justify-between">
            <button onClick={() => setIsSidebarOpen(true)} className="p-2 bg-slate-100/80 hover:bg-slate-200 text-slate-700 rounded-lg">
                <Menu className="w-6 h-6" />
            </button>
            <Store className="w-8 h-8 text-indigo-500" />
        </div>
        
        {selectedSmId ? (
             <div className="w-full min-h-screen">
                {managerView === 'home' && (
                    <div className="p-10 max-w-6xl mx-auto">
                        <div className="flex items-center justify-between mb-8">
                            <div>
                                <h1 className="text-3xl font-extrabold text-slate-800 flex items-center gap-3">
                                    <Store className="w-10 h-10 text-indigo-500"/>
                                    {supermarkets.find(s => s.id === selectedSmId)?.name}
                                </h1>
                                <p className="text-slate-500 text-lg mt-2">Escolha uma ferramenta para gerenciar seu mercado</p>
                            </div>
                            <Button variant="secondary" onClick={() => window.open(`/loja/${selectedSmId}`, '_blank')} className="px-4 py-2 text-sm whitespace-nowrap">
                                Ver Vitrine Pública
                            </Button>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            <div 
                                onClick={() => setManagerView('shelves')}
                                className="bg-white rounded-3xl p-8 border-2 border-slate-100 hover:border-blue-400 hover:shadow-xl hover:shadow-blue-500/10 transition-all cursor-pointer group"
                            >
                                <div className="w-16 h-16 bg-blue-50 text-blue-500 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                                    <Layers className="w-8 h-8"/>
                                </div>
                                <h3 className="text-xl font-bold text-slate-800 mb-2">Organizar Prateleiras</h3>
                                <p className="text-slate-500">Adicione categorias, arraste e solte produtos nas gôndolas para organizar a vitrine.</p>
                            </div>

                            <div 
                                onClick={() => setManagerView('catalog')}
                                className="bg-white rounded-3xl p-8 border-2 border-slate-100 hover:border-orange-400 hover:shadow-xl hover:shadow-orange-500/10 transition-all cursor-pointer group"
                            >
                                <div className="w-16 h-16 bg-orange-50 text-orange-500 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                                    <Tags className="w-8 h-8"/>
                                </div>
                                <h3 className="text-xl font-bold text-slate-800 mb-2">Gestão de Catálogo</h3>
                                <p className="text-slate-500">Edição ágil de preços, pausas rápidas e classificação de produtos por histórico.</p>
                            </div>

                            <div 
                                onClick={() => setManagerView('orders')}
                                className="bg-white rounded-3xl p-8 border-2 border-slate-100 hover:border-green-400 hover:shadow-xl hover:shadow-green-500/10 transition-all cursor-pointer group"
                            >
                                <div className="w-16 h-16 bg-green-50 text-green-500 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                                    <ListChecks className="w-8 h-8"/>
                                </div>
                                <h3 className="text-xl font-bold text-slate-800 mb-2">Separação de Pedidos</h3>
                                <p className="text-slate-500">Tela otimizada para o funcionário percorrer o mercado selecionando os itens.</p>
                            </div>

                            <div 
                                onClick={() => setManagerView('promotions')}
                                className="bg-white rounded-3xl p-8 border-2 border-slate-100 hover:border-red-400 hover:shadow-xl hover:shadow-red-500/10 transition-all cursor-pointer group"
                            >
                                <div className="w-16 h-16 bg-red-50 text-red-500 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                                    <Tags className="w-8 h-8"/>
                                </div>
                                <h3 className="text-xl font-bold text-slate-800 mb-2">Promoções</h3>
                                <p className="text-slate-500">Configure descontos, combos e regras de promoções ativas.</p>
                            </div>

                            <div 
                                onClick={() => setManagerView('delivery')}
                                className="bg-white rounded-3xl p-8 border-2 border-slate-100 hover:border-indigo-400 hover:shadow-xl hover:shadow-indigo-500/10 transition-all cursor-pointer group"
                            >
                                <div className="w-16 h-16 bg-indigo-50 text-indigo-500 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                                    <Truck className="w-8 h-8"/>
                                </div>
                                <h3 className="text-xl font-bold text-slate-800 mb-2">Entregas</h3>
                                <p className="text-slate-500">Configure parceiros de entrega, opções de frete e regras logísticas.</p>
                            </div>

                            <div 
                                onClick={() => setManagerView('analytics')}
                                className="bg-white rounded-3xl p-8 border-2 border-slate-100 hover:border-teal-400 hover:shadow-xl hover:shadow-teal-500/10 transition-all cursor-pointer group"
                            >
                                <div className="w-16 h-16 bg-teal-50 text-teal-500 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                                    <BarChart3 className="w-8 h-8"/>
                                </div>
                                <h3 className="text-xl font-bold text-slate-800 mb-2">Relatórios</h3>
                                <p className="text-slate-500">Métricas de vendas, ticket médio e clientes ativos.</p>
                            </div>

                            <div 
                                onClick={() => setManagerView('inventory')}
                                className="bg-white rounded-3xl p-8 border-2 border-slate-100 hover:border-amber-400 hover:shadow-xl hover:shadow-amber-500/10 transition-all cursor-pointer group"
                            >
                                <div className="w-16 h-16 bg-amber-50 text-amber-500 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                                    <PackageX className="w-8 h-8"/>
                                </div>
                                <h3 className="text-xl font-bold text-slate-800 mb-2">Estoque</h3>
                                <p className="text-slate-500">Alertas de baixo estoque e gerenciamento de quantidades.</p>
                            </div>

                            <div 
                                onClick={() => setManagerView('settings')}
                                className="bg-white rounded-3xl p-8 border-2 border-slate-100 hover:border-blue-400 hover:shadow-xl hover:shadow-blue-500/10 transition-all cursor-pointer group"
                            >
                                <div className="w-16 h-16 bg-blue-50 text-blue-500 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                                    <Settings className="w-8 h-8"/>
                                </div>
                                <h3 className="text-xl font-bold text-slate-800 mb-2">Configurações</h3>
                                <p className="text-slate-500">Horários de funcionamento, métodos de pagamento e dados da loja.</p>
                            </div>

                            <div 
                                onClick={() => setManagerView('staff')}
                                className="bg-white rounded-3xl p-8 border-2 border-slate-100 hover:border-pink-400 hover:shadow-xl hover:shadow-pink-500/10 transition-all cursor-pointer group"
                            >
                                <div className="w-16 h-16 bg-pink-50 text-pink-500 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                                    <Users className="w-8 h-8"/>
                                </div>
                                <h3 className="text-xl font-bold text-slate-800 mb-2">Equipe</h3>
                                <p className="text-slate-500">Gerencie perfis de separadores, gerentes ou atendentes.</p>
                            </div>

                            <div 
                                onClick={() => setManagerView('marketing')}
                                className="bg-white rounded-3xl p-8 border-2 border-slate-100 hover:border-rose-400 hover:shadow-xl hover:shadow-rose-500/10 transition-all cursor-pointer group"
                            >
                                <div className="w-16 h-16 bg-rose-50 text-rose-500 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                                    <Megaphone className="w-8 h-8"/>
                                </div>
                                <h3 className="text-xl font-bold text-slate-800 mb-2">Marketing</h3>
                                <p className="text-slate-500">Envie notificações push e gerencie campanhas e vitrines.</p>
                            </div>

                            <div 
                                onClick={() => setManagerView('reviews')}
                                className="bg-white rounded-3xl p-8 border-2 border-slate-100 hover:border-yellow-400 hover:shadow-xl hover:shadow-yellow-500/10 transition-all cursor-pointer group"
                            >
                                <div className="w-16 h-16 bg-yellow-50 text-yellow-500 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                                    <Star className="w-8 h-8"/>
                                </div>
                                <h3 className="text-xl font-bold text-slate-800 mb-2">Avaliações</h3>
                                <p className="text-slate-500">Acompanhe o feedback dos clientes sobre seus pedidos.</p>
                            </div>

                            <div 
                                onClick={() => setShowTutorial(true)}
                                className="bg-white rounded-3xl p-8 border-2 border-slate-100 hover:border-purple-400 hover:shadow-xl hover:shadow-purple-500/10 transition-all cursor-pointer group"
                            >
                                <div className="w-16 h-16 bg-purple-50 text-purple-500 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                                    <HelpCircle className="w-8 h-8"/>
                                </div>
                                <h3 className="text-xl font-bold text-slate-800 mb-2">Tutorial do Sistema</h3>
                                <p className="text-slate-500">Aprenda o passo a passo para usar todas as funcionalidades do Nexmarket.</p>
                            </div>
                        </div>
                    </div>
                )}
                
                {managerView === 'shelves' && (
                    <div className="p-8 max-w-6xl w-full mx-auto">
                        <div className="flex items-center justify-between mb-8">
                            <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-3">
                                <Layers className="w-7 h-7 text-blue-500"/> 
                                {selectedGdId ? gondolas.find(g=>g.id === selectedGdId)?.name : 'Visão Geral das Prateleiras'}
                            </h2>
                            <div className="flex items-center gap-4">
                                <div className="relative">
                                    <Search className="w-5 h-5 absolute text-slate-400 left-3 top-2.5" />
                                    <input 
                                        type="text"
                                        placeholder="Buscar produto..."
                                        className="pl-10 pr-4 py-2 bg-white border-2 border-slate-200 rounded-xl focus:outline-none focus:border-blue-400 text-slate-700 font-medium"
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                    />
                                </div>
                                <Button onClick={() => openPrModal()} disabled={gondolas.length === 0}>Adicionar Produto</Button>
                            </div>
                        </div>
                        
                        <DragDropContext onDragEnd={handleDragEndProducts}>
                            <div className="bg-slate-200 p-8 rounded-3xl flex flex-col gap-14 shadow-inner min-h-[60vh]">
                                {gondolas.length === 0 && (
                                    <div className="text-center p-8 text-slate-500 font-medium h-full flex flex-col items-center justify-center gap-4">
                                        <Layers className="w-12 h-12 text-slate-400" />
                                        <span>Nenhuma prateleira cadastrada neste mercado.</span>
                                        <Button onClick={() => openGdModal()}>Criar Prateleira</Button>
                                    </div>
                                )}
                                {gondolas.filter(g => selectedGdId === null || g.id === selectedGdId).map(gd => {
                                    const gdProducts = products.filter(p => p.gondolaId === gd.id && p.name.toLowerCase().includes(searchQuery.toLowerCase())).sort((a,b) => (a.order||0) - (b.order||0));
                                    return (
                                        <div key={gd.id} className="relative">
                                            {/* Shelf header */}
                                            <div className="absolute -top-5 left-4 bg-white px-4 py-1.5 rounded-full shadow-sm text-sm font-bold text-slate-600 border-2 border-slate-200 flex items-center gap-2 z-0 transition-transform hover:-translate-y-1 hover:z-20">
                                                <Package className="w-4 h-4 text-blue-500"/> {gd.name}
                                                <button onClick={() => openPrModal(null, gd.id)} className="ml-2 text-blue-500 hover:text-blue-700 bg-blue-50 p-1 rounded-full"><Plus className="w-3 h-3"/></button>
                                            </div>
                                            
                                            {/* The Shelf */}
                                            <Droppable droppableId={gd.id} direction="horizontal">
                                                {(provided, snapshot) => (
                                                    <div 
                                                        {...provided.droppableProps}
                                                        ref={provided.innerRef}
                                                        className={`flex gap-6 pt-10 px-6 pb-2 min-h-[180px] overflow-x-auto border-b-[24px] border-slate-300 rounded-b-sm bg-gradient-to-b from-slate-100/30 to-slate-200/50 transition-colors shadow-[inset_0_-15px_30px_rgba(0,0,0,0.08)] relative ${snapshot.isDraggingOver ? 'bg-blue-50/50 border-blue-400 shadow-[inset_0_-15px_30px_rgba(59,130,246,0.1)]' : ''}`}
                                                    >
                                                        <div className="absolute inset-0 pointer-events-none opacity-[0.03] bg-[url('https://www.transparenttextures.com/patterns/wood-pattern.png')]"></div>
                                                        
                                                        {gdProducts.length === 0 && (
                                                            <div className="w-full text-center text-slate-400 font-medium flex items-center justify-center opacity-50 mt-4">
                                                                Arraste produtos para esta prateleira
                                                            </div>
                                                        )}
                                                        
                                                        {gdProducts.map((pr, index) => {
                                                            const DynamicDraggable = Draggable as any;
                                                            return (
                                                            <DynamicDraggable key={pr.id} draggableId={pr.id} index={index}>
                                                                {(provided: any, snapshot: any) => (
                                                                    <div 
                                                                        {...provided.draggableProps}
                                                                        {...provided.dragHandleProps}
                                                                        ref={provided.innerRef}
                                                                        className={`flex flex-col items-center justify-end w-28 flex-shrink-0 group relative ${snapshot.isDragging ? 'z-50 scale-110 drop-shadow-2xl origin-bottom' : 'hover:-translate-y-2 hover:z-30 transition-transform'}`}
                                                                    >
                                                                        <div className="relative flex flex-col items-center justify-end h-32 mb-1 w-full">
                                                                            {pr.imageUrl ? (
                                                                                <img src={pr.imageUrl} alt={pr.name} className="max-h-full max-w-full object-contain filter drop-shadow-md z-10 relative" />
                                                                            ) : (
                                                                                <div className="w-20 h-24 bg-gradient-to-br from-slate-50 to-slate-200 filter drop-shadow-md border border-slate-300 rounded-sm flex items-center justify-center text-slate-400 z-10 relative">
                                                                                    <Package className="w-8 h-8 opacity-50"/>
                                                                                </div>
                                                                            )}
                                                                            {/* Action buttons (hidden until hover) */}
                                                                            <div className="absolute -top-12 hidden group-hover:flex gap-1.5 bg-white p-1.5 rounded-xl shadow-xl border border-slate-200 z-40">
                                                                                <button onClick={(e) => { e.stopPropagation(); openPrModal(pr); }} className="p-1.5 text-blue-500 hover:bg-blue-50 rounded-lg"><Edit3 className="w-4 h-4"/></button>
                                                                                <button onClick={(e) => { e.stopPropagation(); handleDelete(`supermarkets/${selectedSmId}/products/${pr.id}`); }} className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg"><Trash2 className="w-4 h-4"/></button>
                                                                            </div>
                                                                        </div>
                                                                        {/* Price Tag */}
                                                                        <div className="bg-yellow-300 text-yellow-900 text-xs font-black px-2 py-1 rounded shadow-sm border border-yellow-400 text-center w-full truncate relative after:content-[''] after:absolute after:-top-1 after:left-1/2 after:-translate-x-1/2 after:w-2 after:h-2 after:bg-white/50 after:rounded-full z-10">
                                                                            R$ {pr.price.toFixed(2)}
                                                                        </div>
                                                                        <p className="text-[10px] text-slate-600 font-bold truncate w-full text-center mt-1.5 bg-white/60 rounded px-1">{pr.name}</p>
                                                                    </div>
                                                                )}
                                                            </DynamicDraggable>
                                                        )})}
                                                        {provided.placeholder}
                                                    </div>
                                                )}
                                            </Droppable>
                                        </div>
                                    )
                                })}
                            </div>
                        </DragDropContext>
                    </div>
                )}
                
                {managerView === 'catalog' && (
                    <div className="p-8 max-w-[1400px] w-full mx-auto">
                        <div className="flex items-center justify-between mb-8">
                            <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-3">
                                <Tags className="w-7 h-7 text-orange-500"/> 
                                Gestão de Catálogo
                            </h2>
                        </div>
                        <CatalogManager 
                            supermarketId={selectedSmId} 
                            products={products} 
                            gondolas={gondolas} 
                            onAddProduct={() => openPrModal()}
                            onEditProduct={(pr) => openPrModal(pr)}
                            onDeleteProduct={(prId) => handleDelete(`supermarkets/${selectedSmId}/products/${prId}`)}
                        />
                    </div>
                )}
                
                {managerView === 'promotions' && (
                    <div className="p-8 max-w-[1400px] w-full mx-auto">
                        <div className="flex items-center justify-between mb-8">
                            <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-3">
                                <Tags className="w-7 h-7 text-red-500"/> 
                                Promoções
                            </h2>
                        </div>
                        <PromotionsManager 
                            supermarketId={selectedSmId} 
                            promotions={promotions}
                            gondolas={gondolas}
                            products={products}
                        />
                    </div>
                )}
                
                {managerView === 'delivery' && (
                    <div className="p-8 max-w-[1400px] w-full mx-auto">
                        <div className="flex items-center justify-between mb-8">
                            <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-3">
                                <Truck className="w-7 h-7 text-indigo-500"/> 
                                Configurações de Entrega
                            </h2>
                        </div>
                        <DeliveryConfigManager supermarketId={selectedSmId} />
                    </div>
                )}
                
                {managerView === 'analytics' && (
                    <div className="p-8 max-w-[1400px] w-full mx-auto">
                        <AnalyticsManager supermarketId={selectedSmId} />
                    </div>
                )}

                {managerView === 'inventory' && (
                    <div className="p-8 max-w-[1400px] w-full mx-auto">
                        <InventoryManager supermarketId={selectedSmId} products={products} />
                    </div>
                )}

                {managerView === 'settings' && (
                    <div className="p-8 max-w-[1400px] w-full mx-auto">
                        <StoreSettingsManager supermarketId={selectedSmId} />
                    </div>
                )}

                {managerView === 'staff' && (
                    <div className="p-8 max-w-[1400px] w-full mx-auto">
                        <StaffManager supermarketId={selectedSmId} />
                    </div>
                )}

                {managerView === 'marketing' && (
                    <div className="p-8 max-w-[1400px] w-full mx-auto">
                        <MarketingManager supermarketId={selectedSmId} />
                    </div>
                )}

                {managerView === 'reviews' && (
                    <div className="p-8 max-w-[1400px] w-full mx-auto">
                        <ReviewsManager supermarketId={selectedSmId} />
                    </div>
                )}
                
                {managerView === 'orders' && (
                    <div className="p-8 max-w-4xl w-full mx-auto">
                        <div className="flex items-center justify-between mb-8">
                            <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-3">
                                <ListChecks className="w-7 h-7 text-green-500"/> 
                                Separação de Pedidos
                            </h2>
                        </div>
                        <OrderPicker supermarketId={selectedSmId} products={products} />
                    </div>
                )}
                
                {managerView === 'storefront' && (
                    <div className="p-4 w-full mx-auto h-full overflow-hidden">
                        <StorefrontBuilder supermarketId={selectedSmId} products={products} />
                    </div>
                )}

                {managerView === 'gondolaApp' && (
                    <div className="p-4 w-full mx-auto h-full overflow-hidden">
                        <GondolaAppBuilder supermarketId={selectedSmId} products={products} gondolas={gondolas} />
                    </div>
                )}
             </div>
        ) : (
            <div className="h-screen flex flex-col items-center justify-center p-6">
                {supermarkets.length === 0 ? (
                    <div className="text-center space-y-6">
                        <div className="w-24 h-24 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-6">
                            <Store className="w-12 h-12 text-slate-400" />
                        </div>
                        <h2 className="text-2xl font-bold text-slate-800">Nenhum mercado encontrado</h2>
                        <p className="text-slate-500 max-w-sm mx-auto">Você ainda não tem mercados cadastrados. Clique no botão abaixo para criar seu primeiro mercado.</p>
                        <Button className="h-12 px-8" onClick={() => openSmModal()}>Criar meu primeiro mercado</Button>
                    </div>
                ) : (
                    <div className="w-full max-w-4xl">
                        <h2 className="text-2xl font-bold text-slate-800 mb-8 text-center">Selecione um mercado para começar:</h2>
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
                            {supermarkets.map(sm => (
                                <div 
                                    key={sm.id} 
                                    onClick={() => setSelectedSmId(sm.id)}
                                    className="p-8 bg-white border-2 border-slate-200 rounded-3xl cursor-pointer hover:border-[#58CC02] hover:shadow-lg transition-all text-center flex flex-col items-center gap-4"
                                >
                                    <div className="w-16 h-16 rounded-2xl flex items-center justify-center" style={{ backgroundColor: sm.themeColor + '20' }}>
                                        <Store className="w-8 h-8" style={{ color: sm.themeColor }} />
                                    </div>
                                    <span className="font-bold text-lg text-slate-700">{sm.name}</span>
                                </div>
                            ))}
                            <div 
                                onClick={() => openSmModal()}
                                className="p-8 bg-white border-2 border-dashed border-slate-300 rounded-3xl cursor-pointer hover:border-[#58CC02] hover:bg-slate-50 flex flex-col items-center justify-center gap-4 transition-all"
                            >
                                <div className="w-16 h-16 rounded-2xl flex items-center justify-center bg-slate-100">
                                    <Plus className="w-8 h-8 text-slate-400" />
                                </div>
                                <span className="font-bold text-lg text-slate-500">Novo mercado</span>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        )}
      </div>

      {/* Modals */}
      {isSmModalOpen && (
        <div className="fixed inset-0 bg-slate-800/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white p-6 rounded-3xl shadow-xl w-full max-w-md border-2 border-slate-100">
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-xl font-bold text-slate-800">{editingSmId ? 'Editar Mercado' : 'Novo Mercado'}</h2>
                    <button onClick={() => setSmModalOpen(false)} className="text-slate-400 hover:text-slate-600"><X className="w-6 h-6"/></button>
                </div>
                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-bold text-slate-500 mb-1">Nome</label>
                        <input type="text" className="w-full p-3 border-2 border-slate-200 rounded-xl focus:border-[#58CC02] outline-none font-medium text-slate-700" value={smFormData.name} onChange={e => setSmFormData({...smFormData, name: e.target.value})} placeholder="Nome do mercado" />
                    </div>
                    <div>
                        <label className="block text-sm font-bold text-slate-500 mb-1">Cor Tema</label>
                        <input type="color" className="w-full h-12 p-1 border-2 border-slate-200 rounded-xl cursor-pointer" value={smFormData.themeColor} onChange={e => setSmFormData({...smFormData, themeColor: e.target.value})} />
                    </div>
                    <div>
                        <label className="block text-sm font-bold text-slate-500 mb-1">Logo do Mercado</label>
                        <div className="flex items-center gap-4">
                            {smFormData.logoUrl && <img src={smFormData.logoUrl} alt="Logo" className="w-16 h-16 rounded-xl object-contain bg-slate-50 border-2 border-slate-200" />}
                            {isUploading ? (
                                <div className="flex-1 space-y-2">
                                    <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                                        <div className="h-full bg-[#58CC02] transition-all" style={{ width: `${uploadProgress}%` }} />
                                    </div>
                                    <div className="flex justify-between items-center text-xs text-slate-500">
                                        <span>{uploadProgress}%</span>
                                        <button onClick={cancelUpload} className="text-red-500 hover:underline">Cancelar</button>
                                    </div>
                                </div>
                            ) : (
                                <label className="flex items-center justify-center p-3 border-2 border-dashed border-slate-300 rounded-xl cursor-pointer hover:border-[#58CC02] hover:bg-[#58CC02]/5 transition-colors flex-1 font-medium text-slate-500 hover:text-[#58CC02]">
                                    <Upload className="w-5 h-5 mr-2" />
                                    Fazer upload da Logo
                                    <input type="file" accept="image/*" className="hidden" onChange={(e) => handleImageUpload(e, (url) => setSmFormData({...smFormData, logoUrl: url}))} />
                                </label>
                            )}
                        </div>
                    </div>
                    <Button className="w-full mt-4" onClick={saveSupermarket} disabled={isUploading}>Salvar</Button>
                </div>
            </div>
        </div>
      )}

      {isGdModalOpen && (
        <div className="fixed inset-0 bg-slate-800/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
             <div className="bg-white p-6 rounded-3xl shadow-xl w-full max-w-2xl border-2 border-slate-100 max-h-[90vh] overflow-y-auto">
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-xl font-bold text-slate-800">{editingGdId ? 'Editar Gôndola' : 'Nova Gôndola'}</h2>
                    <button onClick={() => setGdModalOpen(false)} className="text-slate-400 hover:text-slate-600"><X className="w-6 h-6"/></button>
                </div>
                <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-bold text-slate-500 mb-1">Nome</label>
                            <input type="text" className="w-full p-3 border-2 border-slate-200 rounded-xl focus:border-blue-400 outline-none font-medium text-slate-700" value={gdFormData.name} onChange={e => setGdFormData({...gdFormData, name: e.target.value})} placeholder="Ex: Hortifruti" />
                        </div>
                        <div>
                            <label className="block text-sm font-bold text-slate-500 mb-1">Nível de Dificuldade</label>
                            <input type="number" min="1" className="w-full p-3 border-2 border-slate-200 rounded-xl focus:border-blue-400 outline-none font-medium text-slate-700" value={gdFormData.level} onChange={e => setGdFormData({...gdFormData, level: Number(e.target.value)})} />
                        </div>
                    </div>
                    
                    <div>
                        <label className="block text-sm font-bold text-slate-500 mb-1">Cor da Gôndola</label>
                        <div className="flex gap-3">
                            <input type="color" className="p-1 h-12 w-12 rounded-xl cursor-pointer" value={gdFormData.colorTheme} onChange={e => setGdFormData({...gdFormData, colorTheme: e.target.value})} />
                            <div className="flex-1 p-3 border border-slate-200 rounded-xl flex items-center justify-between" style={{ backgroundColor: gdFormData.colorTheme + '10', borderColor: gdFormData.colorTheme }}>
                                <span className="font-bold text-slate-700">Visualização</span>
                                <div className="w-8 h-8 rounded-lg flex items-center justify-center text-white shadow-sm" style={{ backgroundColor: gdFormData.colorTheme }}>
                                    {/* Show the selected icon here */}
                                    {(() => {
                                        const SelectedIcon = GONDOLA_ICONS.find(i => i.id === gdFormData.iconName)?.icon;
                                        return SelectedIcon ? <SelectedIcon className="w-5 h-5" /> : null;
                                    })()}
                                </div>
                            </div>
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-bold text-slate-500 mb-2 mt-4">Ícone</label>
                        <div className="grid grid-cols-5 md:grid-cols-8 gap-2 max-h-[300px] overflow-y-auto p-2 bg-slate-50 rounded-2xl border border-slate-200">
                            {GONDOLA_ICONS.map(iconConfig => {
                                const Icon = iconConfig.icon;
                                const isSelected = gdFormData.iconName === iconConfig.id;
                                return (
                                    <button
                                        key={iconConfig.id}
                                        type="button"
                                        onClick={() => setGdFormData({...gdFormData, iconName: iconConfig.id})}
                                        title={iconConfig.label}
                                        className={`flex flex-col items-center justify-center p-3 rounded-xl transition-all ${
                                            isSelected 
                                                ? 'bg-blue-100 text-blue-600 ring-2 ring-blue-500 ring-offset-1' 
                                                : 'bg-white text-slate-500 hover:bg-slate-100 hover:text-slate-800 border border-slate-200'
                                        }`}
                                    >
                                        <Icon className="w-6 h-6" />
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                    
                    <Button className="w-full mt-4" variant="secondary" onClick={saveGondola}>Salvar</Button>
                </div>
            </div>
        </div>
      )}

      {isPrModalOpen && (
        <div className="fixed inset-0 bg-slate-800/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
             <div className="bg-white p-6 rounded-3xl shadow-xl w-full max-w-md border-2 border-slate-100 max-h-[90vh] overflow-y-auto">
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-xl font-bold text-slate-800">{editingPrId ? 'Editar Produto' : 'Novo Produto'}</h2>
                    <button onClick={() => setPrModalOpen(false)} className="text-slate-400 hover:text-slate-600"><X className="w-6 h-6"/></button>
                </div>
                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-bold text-slate-500 mb-1">Nome do Produto</label>
                        <input type="text" className="w-full p-3 border-2 border-slate-200 rounded-xl focus:border-blue-400 outline-none font-medium text-slate-700" value={prFormData.name} onChange={e => setPrFormData({...prFormData, name: e.target.value})} placeholder="Ex: Arroz" />
                    </div>
                    <div>
                        <label className="block text-sm font-bold text-slate-500 mb-1">Preço</label>
                        <input 
                            type="text" 
                            className="w-full p-3 border-2 border-slate-200 rounded-xl focus:border-blue-400 outline-none font-medium text-slate-700" 
                            value={prFormData.price > 0 ? prFormData.price.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) : ''} 
                            onChange={e => {
                                const rawValue = e.target.value.replace(/\D/g, '');
                                const numericValue = rawValue ? parseInt(rawValue, 10) / 100 : 0;
                                setPrFormData({...prFormData, price: numericValue});
                            }}
                            placeholder="R$ 0,00" />
                    </div>
                    <div>
                        <label className="block text-sm font-bold text-slate-500 mb-1">Imagem do Produto</label>
                        <div className="flex items-center gap-4">
                            {prFormData.imageUrl && <img src={prFormData.imageUrl} alt="Produto" className="w-16 h-16 rounded-xl object-contain bg-slate-50 border-2 border-slate-200" />}
                            <label className={`flex items-center justify-center p-3 border-2 border-dashed border-slate-300 rounded-xl cursor-pointer hover:border-blue-400 hover:bg-blue-50 transition-colors flex-1 font-medium ${isUploading ? 'text-slate-400 cursor-not-allowed' : 'text-slate-500 hover:text-blue-500'}`}>
                                <Upload className="w-5 h-5 mr-2" />
                                {isUploading ? 'Enviando...' : 'Fazer upload da Imagem'}
                                <input type="file" accept="image/*" className="hidden" onChange={(e) => handleImageUpload(e, (url) => setPrFormData({...prFormData, imageUrl: url}))} disabled={isUploading} />
                            </label>
                        </div>
                    </div>
                    <div>
                        <label className="block text-sm font-bold text-slate-500 mb-1">Gôndola</label>
                        <select className="w-full p-3 border-2 border-slate-200 rounded-xl focus:border-blue-400 outline-none font-medium text-slate-700 bg-white" value={prFormData.gondolaId} onChange={e => setPrFormData({...prFormData, gondolaId: e.target.value})}>
                            {gondolas.map(gd => <option key={gd.id} value={gd.id}>{gd.name}</option>)}
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-bold text-slate-500 mb-1">Subcategoria (Opcional)</label>
                        <input type="text" className="w-full p-3 border-2 border-slate-200 rounded-xl focus:border-blue-400 outline-none font-medium text-slate-700" value={prFormData.subcategory} onChange={e => setPrFormData({...prFormData, subcategory: e.target.value})} placeholder="Ex: Bebidas Alcoólicas" list="subcategories-list" />
                        <datalist id="subcategories-list">
                            {Array.from(new Set(products.map(p => p.subcategory).filter(Boolean))).map(sub => (
                                <option key={sub as string} value={sub as string} />
                            ))}
                        </datalist>
                    </div>

                    <div className="pt-4 border-t-2 border-slate-100">
                        <label className="flex items-center gap-3 cursor-pointer p-4 border-2 border-slate-200 rounded-xl hover:border-blue-400 transition-colors">
                            <input 
                                type="checkbox" 
                                className="w-5 h-5 text-blue-600 rounded focus:ring-blue-500" 
                                checked={prFormData.trackInventory} 
                                onChange={e => setPrFormData({...prFormData, trackInventory: e.target.checked})} 
                            />
                            <div>
                                <span className="font-bold text-slate-700 block text-sm">Controlar Estoque Sincronizado</span>
                                <span className="text-xs text-slate-500">Módulo descontará o saldo ao vender e enviará alertas.</span>
                            </div>
                        </label>
                    </div>

                    {prFormData.trackInventory && (
                        <div className="grid grid-cols-3 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-200">
                            <div>
                                <label className="block text-xs font-bold text-slate-500 mb-1">Qtd Atual</label>
                                <input type="number" min="0" className="w-full p-2 border-2 border-slate-200 rounded-lg focus:border-blue-400 outline-none" value={prFormData.stockQuantity} onChange={e => setPrFormData({...prFormData, stockQuantity: Number(e.target.value)})} placeholder="0" />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-500 mb-1">Alerta (Qtd)</label>
                                <input type="number" min="0" className="w-full p-2 border-2 border-slate-200 rounded-lg focus:border-yellow-400 outline-none" value={prFormData.alertQuantity} onChange={e => setPrFormData({...prFormData, alertQuantity: Number(e.target.value)})} placeholder="10" />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-500 mb-1">Crítico (Qtd)</label>
                                <input type="number" min="0" className="w-full p-2 border-2 border-slate-200 rounded-lg focus:border-red-400 outline-none" value={prFormData.criticalQuantity} onChange={e => setPrFormData({...prFormData, criticalQuantity: Number(e.target.value)})} placeholder="5" />
                            </div>
                        </div>
                    )}

                    <Button className="w-full mt-4" variant="secondary" onClick={saveProduct} disabled={isUploading}>Salvar</Button>
                </div>
            </div>
        </div>
      )}
      {showTutorial && (
        <div className="fixed inset-0 bg-slate-800/40 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
             <div className="bg-white p-8 rounded-3xl shadow-xl w-full max-w-3xl border-2 border-slate-100 max-h-[90vh] overflow-y-auto">
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-3">
                        <HelpCircle className="w-8 h-8 text-blue-500"/> Tutorial do Nexmarket
                    </h2>
                    <button onClick={() => setShowTutorial(false)} className="text-slate-400 hover:text-slate-600"><X className="w-6 h-6"/></button>
                </div>
                
                <div className="space-y-8 text-slate-600 font-medium">
                    <div className="flex gap-4">
                        <div className="w-12 h-12 bg-green-100 text-green-600 rounded-full flex items-center justify-center flex-shrink-0 font-bold text-xl">1</div>
                        <div>
                            <h3 className="text-lg font-bold text-slate-800 mb-1">Crie seu Mercado & Configurações</h3>
                            <p className="mb-2">Comece criando seu mercado pelo botão de "+" na barra lateral esquerda. Defina o nome oficial, uma cor tema atrativa e faça upload da sua logo.</p>
                            <p className="text-sm text-slate-500 bg-slate-50 p-3 rounded-xl border border-slate-100">💡 <b>Dica:</b> Depois de criado, acesse <b>Configurações</b> no painel principal para estabelecer os horários de funcionamento, raio de entrega e os métodos de pagamento (como PIX ou Cartão) aceitos.</p>
                        </div>
                    </div>
                    
                    <div className="flex gap-4">
                        <div className="w-12 h-12 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center flex-shrink-0 font-bold text-xl">2</div>
                        <div>
                            <h3 className="text-lg font-bold text-slate-800 mb-1">Organize Produtos e Estoque</h3>
                            <p className="mb-2">Simule os corredores da sua loja física criando <b>Prateleiras</b> (ex: Laticínios, Padaria). Em seguida, adicione seus produtos com imagens nítidas, descrições e códigos de barras.</p>
                            <p className="text-sm text-slate-500 bg-slate-50 p-3 rounded-xl border border-slate-100">💡 <b>Dica:</b> Utilize o <b>Catálogo</b> para alterar preços de vários produtos rapidamente e o módulo de <b>Estoque</b> para monitorar saídas e receber alertas quando produtos essenciais estiverem acabando.</p>
                        </div>
                    </div>
                    
                    <div className="flex gap-4">
                        <div className="w-12 h-12 bg-yellow-100 text-yellow-600 rounded-full flex items-center justify-center flex-shrink-0 font-bold text-xl">3</div>
                        <div>
                            <h3 className="text-lg font-bold text-slate-800 mb-1">Logística e Equipe</h3>
                            <p className="mb-2">Decida como os produtos chegam aos clientes na guia <b>Entregas</b>: use parceiros da Nexmarket ou ative sua própria frota. Configure também taxas fixas ou frete grátis com valor mínimo.</p>
                            <p className="text-sm text-slate-500 bg-slate-50 p-3 rounded-xl border border-slate-100">💡 <b>Dica:</b> Na aba <b>Equipe</b>, convide seus funcionários (ex: separadores e caixas) para que eles acessem o sistema com as permissões corretas.</p>
                        </div>
                    </div>
                    
                    <div className="flex gap-4">
                        <div className="w-12 h-12 bg-purple-100 text-purple-600 rounded-full flex items-center justify-center flex-shrink-0 font-bold text-xl">4</div>
                        <div>
                            <h3 className="text-lg font-bold text-slate-800 mb-1">Promoções e Marketing</h3>
                            <p className="mb-2">Impulsione vendas criando ofertas na aba <b>Promoções</b>, como descontos temporários ou "Compre 1 Leve 2". As promoções recebem destaque especial na vitrine do cliente.</p>
                            <p className="text-sm text-slate-500 bg-slate-50 p-3 rounded-xl border border-slate-100">💡 <b>Dica:</b> No <b>Marketing</b>, envie notificações push diretamente para o celular dos seus clientes (ex: "As ofertas da semana chegaram! Fique por dentro").</p>
                        </div>
                    </div>

                    <div className="flex gap-4">
                        <div className="w-12 h-12 bg-teal-100 text-teal-600 rounded-full flex items-center justify-center flex-shrink-0 font-bold text-xl">5</div>
                        <div>
                            <h3 className="text-lg font-bold text-slate-800 mb-1">Acompanhe seus Resultados</h3>
                            <p className="mb-2">Na guia <b>Relatórios</b>, você visualiza métricas de ouro como faturamento diário, ticket médio e clientes ativos em gráficos fáceis de ler.</p>
                            <p className="text-sm text-slate-500 bg-slate-50 p-3 rounded-xl border border-slate-100">💡 <b>Dica:</b> Fique sempre de olho nas <b>Avaliações</b> para garantir que a separação dos produtos e a entrega estão atendendo às expectativas dos consumidores.</p>
                        </div>
                    </div>
                    
                    <div className="flex gap-4">
                        <div className="w-12 h-12 bg-orange-100 text-orange-600 rounded-full flex items-center justify-center flex-shrink-0 font-bold text-xl">6</div>
                        <div>
                            <h3 className="text-lg font-bold text-slate-800 mb-1">Venda e Receba Pedidos!</h3>
                            <p className="mb-2">Sua loja está pronta! Clique em <Smartphone className="w-4 h-4 inline mx-1"/> <b>Ver Aplicativo</b> para pré-visualizar a experiência e obter o link que será divulgado no seu Instagram/WhatsApp.</p>
                            <p className="text-sm text-slate-500 bg-slate-50 p-3 rounded-xl border border-slate-100">💡 <b>Dica:</b> Mantenha a aba <b>Pedidos</b> aberta no seu caixa. Novos pedidos de clientes chegarão ali com um alerta sonoro informando o status da separação até a entrega.</p>
                        </div>
                    </div>
                </div>
                
                <div className="mt-8 pt-6 border-t-2 border-slate-100 text-center sticky bottom-0 bg-white">
                    <Button onClick={() => setShowTutorial(false)} className="px-8 py-3 text-lg w-full md:w-auto">Entendido, começar a usar!</Button>
                </div>
            </div>
        </div>
      )}
    </div>
  );
}
