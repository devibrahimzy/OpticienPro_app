import { VenteLigneFormData, Mutuelle } from './types';

// API base URL
export const API_BASE_URL = "http://127.0.0.1:3001";

// Calculate total for a single line item
export const calculateLigneTotal = (ligne: VenteLigneFormData) => {
  const ht = ligne.qte * ligne.pu_ht * (1 - ligne.remise / 100);
  return ht * (1 + ligne.tva / 100);
};

// Calculate totals for all line items
export const calculateTotals = (lignesTemp: VenteLigneFormData[]) => {
  let totalHT = 0;
  let totalTTC = 0;
  
  lignesTemp.forEach(l => {
    if (l.produit_id > 0) {
      const ht = l.qte * l.pu_ht * (1 - l.remise / 100);
      totalHT += ht;
      totalTTC += ht * (1 + l.tva / 100);
    }
  });
  
  return { totalHT, totalTTC };
};

// Calculate mutuelle coverage
export const calculateMutuelleCoverage = (totalTTC: number, mutuelleId: number | undefined | null, mutuelles: Mutuelle[]) => {
  if (!mutuelleId) return 0;
  
  const mutuelle = mutuelles.find(m => m.id === mutuelleId);
  if (!mutuelle) return 0;
  
  let coverage = mutuelle.couverture_type === "%" 
    ? totalTTC * (mutuelle.couverture_valeur / 100) 
    : mutuelle.couverture_valeur;
    
  if (mutuelle.plafond > 0 && coverage > mutuelle.plafond) {
    coverage = mutuelle.plafond;
  }
  
  return coverage;
};

// API functions
export const fetchVentesData = async (userId: number, role: string) => {
  const [ventesRes, clientsRes, mutuellesRes, monturesRes, verresRes] = await Promise.all([
    fetch(`${API_BASE_URL}/ventes?user_id=${userId}&user_role=${role}`),
    fetch(`${API_BASE_URL}/clients?archived=false`),
    fetch(`${API_BASE_URL}/mutuelles`),
    fetch(`${API_BASE_URL}/montures-with-stock`),
    fetch(`${API_BASE_URL}/verres-with-stock`),
  ]);

  if (!ventesRes.ok) throw new Error("Failed to fetch ventes");
  if (!clientsRes.ok) throw new Error("Failed to fetch clients");
  if (!mutuellesRes.ok) throw new Error("Failed to fetch mutuelles");
  if (!monturesRes.ok) throw new Error("Failed to fetch montures");
  if (!verresRes.ok) throw new Error("Failed to fetch verres");

  const ventesData = await ventesRes.json();
  const clientsData = await clientsRes.json();
  const mutuellesData = await mutuellesRes.json();
  const monturesData = await monturesRes.json();
  const verresData = await verresRes.json();

  const monturesWithStock = monturesData.map((m: any) => ({ 
    ...m, 
    type: "monture", 
    nom: `${m.marque} ${m.ref}`,
    stock: m.stock || 0
  }));
  
  const verresWithStock = verresData.map((v: any) => ({ 
    ...v, 
    type: "verre", 
    nom: `${v.type_verre} ${v.ref} (Indice ${v.indice})`,
    stock: v.stock || 0
  }));

  return {
    ventes: ventesData,
    clients: clientsData,
    mutuelles: mutuellesData,
    montures: monturesWithStock,
    verres: verresWithStock
  };
};

export const fetchVenteDetails = async (venteId: number) => {
  const [paiementsRes, factureRes] = await Promise.all([
    fetch(`${API_BASE_URL}/reglements/${venteId}`),
    fetch(`${API_BASE_URL}/factures/vente/${venteId}`),
  ]);

  let paiements = [];
  let facture = null;

  if (paiementsRes.ok) {
    paiements = await paiementsRes.json();
  }

  if (factureRes.ok) {
    const factureData = await factureRes.json();
    if (factureData.length > 0) {
      facture = factureData[0];
    }
  }

  return { paiements, facture };
};

export const saveVente = async (venteData: any, editingVente: any) => {
  const response = await fetch(
    `${API_BASE_URL}/ventes${editingVente ? `/${editingVente.id}` : ""}`, 
    {
      method: editingVente ? "PUT" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(venteData),
    }
  );

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error || "Erreur lors de la sauvegarde");
  }

  return response.json(); // Return the full response including the invoice
};

export const deleteVente = async (venteId: number) => {
  const response = await fetch(`${API_BASE_URL}/ventes/${venteId}`, { 
    method: "DELETE" 
  });
  
  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error || "Erreur lors de la suppression");
  }
  
  return response.json();
};

export const processPayment = async (venteId: number, paymentData: any) => {
  const response = await fetch(`${API_BASE_URL}/ventes/${venteId}/paiement`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(paymentData),
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error || "Erreur lors du paiement");
  }

  return response.json();
};