import { z } from "zod";

// Schema definitions
export const venteLigneSchema = z.object({
  produit_type: z.enum(["monture", "verre"]),
  produit_id: z.number().min(1, "Le produit est requis"),
  qte: z.number().min(1, "La quantité doit être au moins 1"),
  pu_ht: z.number().min(0, "Le prix unitaire doit être positif"),
  remise: z.number().min(0).max(100, "La remise doit être entre 0 et 100%"),
  tva: z.number().min(0).max(100, "La TVA doit être entre 0 et 100%"),
  total_ligne: z.number().min(0, "Le total ligne doit être positif"),
});

export const venteSchema = z.object({
  client_id: z.number().min(1, "Le client est requis"),
  mutuelle_id: z.number().optional().nullable(),
  avance: z.number().min(0, "L'avance doit être positive"),
});

// Type definitions
export type VenteFormData = z.infer<typeof venteSchema>;
export type VenteLigneFormData = z.infer<typeof venteLigneSchema>;

export interface VenteLigne extends VenteLigneFormData {
  id: number;
  vente_id: number;
  produit_nom?: string;
  produit_ref?: string;
}

export interface Vente {
  id: number;
  client_id: number;
  client_nom: string;
  user_id: number;
  user_nom: string;
  mutuelle_id?: number;
  mutuelle_nom?: string;
  date_vente: string;
  total_ht: number;
  total_ttc: number;
  total_mutuelle: number;
  total_client: number;
  avance: number;
  reste: number;
  statut: string;
  lignes: VenteLigne[];
}

export interface Client {
  id: number;
  nom: string;
  prenom: string;
  tel?: string;
  email?: string;
}

export interface Mutuelle {
  id: number;
  nom: string;
  couverture_type: string;
  couverture_valeur: number;
  plafond: number;
}

export interface Produit {
  id: number;
  ref: string;
  prix_vente: number;
  nom?: string;
  type?: string;
  marque?: string;
  type_verre?: string;
  indice?: number;
  stock?: number;
}

export interface Reglement {
  id: number;
  vente_id: number;
  mode: string;
  montant: number;
  date_reglement: string;
  ref_piece?: string;
}

export interface Facture {
  id: number;
  vente_id: number;
  numero: string;
  date_facture: string;
  total_ttc: number;
  statut: string;
}

export interface VentesModuleProps {
  userId: number;
  username: string;
  role: string;
}