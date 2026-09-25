/** INDIVIDUAL = pessoa física (CPF); COMPANY = pessoa jurídica (CNPJ). */
export type PersonType = 'INDIVIDUAL' | 'COMPANY';

/** Espelha CustomerController.CustomerResponse no back-end. */
export interface Customer {
  id: number;
  personType: PersonType;
  name: string;
  taxId: string | null;
  contactPerson: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  district: string | null;
  city: string | null;
  postalCode: string | null;
}

/** Espelha o record CustomerRequest no back-end. */
export type CustomerRequest = Omit<Customer, 'id'>;

/** Formato do Page serializado com spring.data.web.pageable.serialization-mode=via-dto. */
export interface Page<T> {
  content: T[];
  page: { size: number; number: number; totalElements: number; totalPages: number };
}

/** 24839705000165 -> 24.839.705/0001-65 ; 12345678909 -> 123.456.789-09 */
export function formatTaxId(taxId: string | null | undefined): string {
  if (!taxId) return '';
  const d = taxId.replace(/\D/g, '');
  if (d.length === 14) return d.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, '$1.$2.$3/$4-$5');
  if (d.length === 11) return d.replace(/^(\d{3})(\d{3})(\d{3})(\d{2})$/, '$1.$2.$3-$4');
  return taxId;
}
