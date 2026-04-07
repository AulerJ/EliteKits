import { createClient, createPublicClient, createServiceRoleClient } from "@/lib/supabase/server";
import { CATEGORIES, getCategoryConfig } from "@/lib/categories";
import {
  activeSecondaryStoreSlug,
  fetchVisibleListingPriceMap,
  filterAndApplyListingPrices,
  getListingPriceEntry,
  listingMapHas,
} from "@/lib/store-listings";

/** Leituras de listagem (vitrine secundária): service role se existir; senão anon + RLS. */
function catalogSupabaseForListings() {
  return createServiceRoleClient() ?? createPublicClient();
}

const HERO_IMAGES_KEY = "hero_images";
const HOME_REVIEW_IMAGES_KEY = "home_review_images";
const HOME_PAGE_CONFIG_KEY = "home_page_config";

export const HOME_SECTION_IDS = [
  "categories",
  "featured-products",
  "latest-products",
  "encomenda-banner",
  "reviews",
  "instagram",
] as const;

export type HomeSectionId = (typeof HOME_SECTION_IDS)[number];

export const DEFAULT_HOME_SECTION_ORDER: HomeSectionId[] = [
  "categories",
  "featured-products",
  "latest-products",
  "encomenda-banner",
  "reviews",
  "instagram",
];

export type HomePageConfig = {
  featuredProductIds: string[];
  sectionOrder: HomeSectionId[];
  /** URL da imagem do banner de encomendas (clicável para WhatsApp). */
  encomendaBannerUrl: string | null;
};

function normalizeHomeSectionOrder(value: unknown): HomeSectionId[] {
  const source = Array.isArray(value) ? value : DEFAULT_HOME_SECTION_ORDER;
  const filtered = source.filter(
    (item): item is HomeSectionId =>
      typeof item === "string" &&
      (HOME_SECTION_IDS as readonly string[]).includes(item)
  );

  const unique: HomeSectionId[] = [];
  for (const item of filtered) {
    if (!unique.includes(item)) {
      unique.push(item);
    }
  }

  for (const item of DEFAULT_HOME_SECTION_ORDER) {
    if (!unique.includes(item)) {
      unique.push(item);
    }
  }

  return unique;
}

export async function getHomePageConfig(): Promise<HomePageConfig> {
  try {
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
      return {
        featuredProductIds: [],
        sectionOrder: DEFAULT_HOME_SECTION_ORDER,
        encomendaBannerUrl: null,
      };
    }

    const supabase = createPublicClient();
    if (!supabase) {
      return {
        featuredProductIds: [],
        sectionOrder: DEFAULT_HOME_SECTION_ORDER,
        encomendaBannerUrl: null,
      };
    }

    const { data } = await supabase
      .schema("favelastore")
      .from("site_settings")
      .select("value")
      .eq("key", HOME_PAGE_CONFIG_KEY)
      .maybeSingle();

    const raw = (data as { value?: string } | null)?.value;
    if (!raw?.trim()) {
      return {
        featuredProductIds: [],
        sectionOrder: DEFAULT_HOME_SECTION_ORDER,
        encomendaBannerUrl: null,
      };
    }

    const parsed = JSON.parse(raw) as
      | { featuredProductIds?: unknown; sectionOrder?: unknown; encomendaBannerUrl?: unknown }
      | null;

    const featuredProductIds = Array.isArray(parsed?.featuredProductIds)
      ? parsed.featuredProductIds.filter(
          (id): id is string => typeof id === "string" && id.trim().length > 0
        )
      : [];
    const encomendaBannerUrl =
      typeof parsed?.encomendaBannerUrl === "string" && parsed.encomendaBannerUrl.trim().length > 0
        ? parsed.encomendaBannerUrl.trim()
        : null;

    return {
      featuredProductIds,
      sectionOrder: normalizeHomeSectionOrder(parsed?.sectionOrder),
      encomendaBannerUrl,
    };
  } catch {
    return {
      featuredProductIds: [],
      sectionOrder: DEFAULT_HOME_SECTION_ORDER,
      encomendaBannerUrl: null,
    };
  }
}

export async function getHeroImages(): Promise<string[]> {
  try {
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL) return [];
    const supabase = createPublicClient();
    if (!supabase) return [];
    const { data } = await supabase
      .schema("favelastore")
      .from("site_settings")
      .select("value")
      .eq("key", HERO_IMAGES_KEY)
      .maybeSingle();
    const raw = (data as { value?: string } | null)?.value;
    if (!raw?.trim()) return [];
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed) ? parsed.filter((u): u is string => typeof u === "string" && u.trim().length > 0) : [];
  } catch {
    return [];
  }
}

export async function getHomeReviewImages(): Promise<string[]> {
  try {
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL) return [];
    const supabase = createPublicClient();
    if (!supabase) return [];
    const { data } = await supabase
      .schema("favelastore")
      .from("site_settings")
      .select("value")
      .eq("key", HOME_REVIEW_IMAGES_KEY)
      .maybeSingle();
    const raw = (data as { value?: string } | null)?.value;
    if (!raw?.trim()) return [];
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed)
      ? parsed.filter(
          (url): url is string =>
            typeof url === "string" && url.trim().length > 0
        )
      : [];
  } catch {
    return [];
  }
}

export async function getCategories(parentId?: string | null) {
  try {
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL) return CATEGORIES;
    const supabase = createPublicClient();
    if (!supabase) return CATEGORIES;
    const query = supabase
      .schema("favelastore")
      .from("categories")
      .select("*")
      .eq("is_active", true)
      .order("sort_order", { ascending: true });
    if (parentId === undefined || parentId === null) {
      query.is("parent_id", null);
    } else {
      query.eq("parent_id", parentId);
    }
    const { data } = await query;

    if (!data?.length) return parentId ? [] : CATEGORIES;

    const excludeSlugs = ["camisas", "juliet"];
    return data
      .filter((cat) => !excludeSlugs.includes(cat.slug))
      .map((cat) => {
      const config = getCategoryConfig(cat.slug);
      return {
        id: cat.id,
        name: cat.name,
        slug: cat.slug,
        parent_id: cat.parent_id ?? null,
        image: (cat as { image_url?: string | null }).image_url?.trim() || config.image,
        icon: config.icon,
      };
    });
  } catch {
    return parentId ? [] : CATEGORIES;
  }
}

export type CategoryTreeNode = {
  id: string;
  name: string;
  slug: string;
  path: string[];
  children: CategoryTreeNode[];
};

function getConfiguredCategoryImage(slug: string): string | null {
  const match = CATEGORIES.find((category) => category.slug === slug);
  return match?.image ?? null;
}

/** Categorias em árvore (raiz → filhos → subfilhos) para menu. */
export async function getCategoriesTree(): Promise<CategoryTreeNode[]> {
  try {
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL) return [];
    const supabaseClient = createPublicClient();
    if (!supabaseClient) return [];
    const excludeSlugs = ["camisas", "juliet"];

    async function loadChildren(parentId: string | null, path: string[]): Promise<CategoryTreeNode[]> {
      const query = supabaseClient!
        .schema("favelastore")
        .from("categories")
        .select("id, name, slug, parent_id")
        .eq("is_active", true)
        .order("sort_order", { ascending: true });
      if (parentId === null) query.is("parent_id", null);
      else query.eq("parent_id", parentId);
      const { data } = await query;
      if (!data?.length) return [];
      const list = (data as { id: string; name: string; slug: string; parent_id: string | null }[])
        .filter((c) => !excludeSlugs.includes(c.slug));
      const nodes: CategoryTreeNode[] = [];
      for (const c of list) {
        const childPath = [...path, c.slug];
        const children = await loadChildren(c.id, childPath);
        nodes.push({
          id: c.id,
          name: c.name,
          slug: c.slug,
          path: childPath,
          children,
        });
      }
      return nodes;
    }

    return loadChildren(null, []);
  } catch {
    return [];
  }
}

/** Resolve category by path segments (e.g. ['camisa'] or ['camisa','tamanho-p']) */
type ResolvedCategoryByPath = {
  id: string;
  name: string;
  slug: string;
  parent_id: string | null;
  image: string | null;
};

async function getCategoryByPath(
  supabase: Awaited<ReturnType<typeof createClient>> | NonNullable<ReturnType<typeof createPublicClient>>,
  slugSegments: string[]
): Promise<ResolvedCategoryByPath | null> {
  if (!slugSegments.length) return null;
  let parentId: string | null = null;
  let parentSlug: string | null = null;
  let category: ResolvedCategoryByPath | null = null;
  let lastKnownImage: string | null = null;
  for (const seg of slugSegments) {
    const segNorm = seg.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
    type CatRow = { id: string; name: string; slug: string; parent_id: string | null; image_url?: string | null };
    let cat: CatRow | null = null;
    // Categoria raiz: buscar por slug exato primeiro
    if (parentId === null) {
      let query = supabase
        .schema("favelastore")
        .from("categories")
        .select("id, name, slug, parent_id, image_url")
        .eq("slug", segNorm)
        .is("parent_id", null)
        .eq("is_active", true);
      const result = await query.maybeSingle();
      cat = result.data as CatRow | null;
      // URL pode ser "camisa" mas no banco está "camisas" (e vice-versa)
      if (!cat) {
        const trySlug = segNorm.endsWith("s") ? segNorm.slice(0, -1) : segNorm + "s";
        const { data: catRoot } = await supabase
          .schema("favelastore")
          .from("categories")
          .select("id, name, slug, parent_id, image_url")
          .eq("slug", trySlug)
          .is("parent_id", null)
          .eq("is_active", true)
          .maybeSingle();
        if (catRoot) cat = catRoot as CatRow;
      }
    } else {
      // Subcategoria: tentar PRIMEIRO slugs compostos (ex: camisas-xl) — onde estão os produtos do fluxo "adicionar em várias"
      if (parentSlug != null) {
        const altSlugs = [
          `${parentSlug}-${segNorm}`,
          parentSlug.endsWith("s") ? `${parentSlug.slice(0, -1)}-${segNorm}` : `${parentSlug}s-${segNorm}`,
        ].filter((s, i, a) => a.indexOf(s) === i);
        for (const altSlug of altSlugs) {
          const { data: catAlt } = await supabase
            .schema("favelastore")
            .from("categories")
            .select("id, name, slug, parent_id, image_url")
            .eq("slug", altSlug)
            .eq("parent_id", parentId)
            .eq("is_active", true)
            .maybeSingle();
          if (catAlt) {
            cat = catAlt as CatRow;
            break;
          }
        }
      }
      // Depois slug simples (ex: xl)
      if (!cat) {
        const result = await supabase
          .schema("favelastore")
          .from("categories")
          .select("id, name, slug, parent_id, image_url")
          .eq("slug", segNorm)
          .eq("parent_id", parentId)
          .eq("is_active", true)
          .maybeSingle();
        cat = result.data as CatRow | null;
      }
      // Último recurso: listar filhos e preferir slug composto sobre curto
      if (!cat) {
        const { data: children } = await supabase
          .schema("favelastore")
          .from("categories")
          .select("id, name, slug, parent_id, image_url")
          .eq("parent_id", parentId)
          .eq("is_active", true);
        const matches = (children ?? []).filter(
          (c) => c.slug.toLowerCase() === segNorm || c.slug.toLowerCase().endsWith("-" + segNorm)
        ) as CatRow[];
        const compoundFirst = matches.sort((a, b) => {
          const aCompound = a.slug.includes("-") && a.slug.toLowerCase().endsWith("-" + segNorm);
          const bCompound = b.slug.includes("-") && b.slug.toLowerCase().endsWith("-" + segNorm);
          if (aCompound && !bCompound) return -1;
          if (!aCompound && bCompound) return 1;
          return 0;
        });
        if (compoundFirst.length) cat = compoundFirst[0];
      }
    }
    if (!cat) return null;
    const imageFromRow =
      typeof (cat as { image_url?: string | null }).image_url === "string" &&
      (cat as { image_url?: string | null }).image_url!.trim().length > 0
        ? (cat as { image_url?: string | null }).image_url!.trim()
        : null;
    const configuredImage = getConfiguredCategoryImage(cat.slug);
    lastKnownImage = imageFromRow ?? configuredImage ?? lastKnownImage;
    category = {
      id: cat.id,
      name: cat.name,
      slug: cat.slug,
      parent_id: cat.parent_id,
      image: lastKnownImage,
    };
    parentId = cat.id;
    parentSlug = cat.slug;
  }
  return category;
}

export async function getCategoryShareData(slugPath: string | string[]) {
  try {
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL) return null;
    const supabase = createPublicClient();
    if (!supabase) return null;
    const segments = Array.isArray(slugPath) ? slugPath : [slugPath];
    return await getCategoryByPath(supabase, segments);
  } catch {
    return null;
  }
}

export async function getProductsByCategory(
  slugPath: string | string[],
  sizeFilter?: string,
  orderBy?: "price" | "created_at" | "sort_order"
) {
  try {
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL) return { category: null, products: [], sizes: [], children: [], siblings: [] };
    // Service role para o catálogo: evita RLS/permissões que impedem anon de ver categorias/produtos; filtramos is_active na query
    const supabase = createServiceRoleClient() ?? createPublicClient();
    if (!supabase) return { category: null, products: [], sizes: [], children: [], siblings: [] };
    const segments = Array.isArray(slugPath) ? slugPath : [slugPath];
    const category = await getCategoryByPath(supabase, segments);
    if (!category) return { category: null, products: [], sizes: [], children: [], siblings: [] };

    let query = supabase
      .schema("favelastore")
      .from("products")
      .select(`
        *,
        product_images(url, storage_path)
      `)
      .eq("category_id", category.id)
      .eq("is_active", true);

    if (sizeFilter) {
      query = query.eq("size", sizeFilter);
    }

    if (orderBy === "price") {
      query = query.order("price", { ascending: true });
    } else if (orderBy === "created_at") {
      query = query.order("created_at", { ascending: false });
    } else {
      query = query.order("sort_order", { ascending: true });
    }

    const { data: products } = await query;
    let productList = products ?? [];

    const storeSlug = activeSecondaryStoreSlug();
    if (storeSlug && productList.length > 0) {
      const listingClient = catalogSupabaseForListings();
      if (!listingClient) {
        productList = [];
      } else {
        const { map } = await fetchVisibleListingPriceMap(listingClient, storeSlug);
        productList = filterAndApplyListingPrices(
          productList as { id: string; price?: number | null }[],
          map
        ) as typeof productList;
      }
    }

    // Ordenar por preço em JS: com preço primeiro (menor→maior), sem preço por último
    if (orderBy === "price" && productList.length > 0) {
      const withPrice = (productList as { price?: number | null }[])
        .filter((p) => p.price != null)
        .sort((a, b) => (a.price ?? 0) - (b.price ?? 0));
      const withoutPrice = (productList as { price?: number | null }[]).filter((p) => p.price == null);
      productList = [...withPrice, ...withoutPrice];
    }

    let sizes: string[] = [];
    try {
      const { data: sizeRows } = await supabase
        .schema("favelastore")
        .from("category_sizes")
        .select("name")
        .eq("category_id", category.id)
        .order("sort_order", { ascending: true });
      sizes = (sizeRows ?? []).map((r) => r.name);
    } catch {
      sizes = [];
    }
    if (sizes.length === 0) {
      const { data: allProducts } = await supabase
        .schema("favelastore")
        .from("products")
        .select("size")
        .eq("category_id", category.id)
        .eq("is_active", true)
        .not("size", "is", null);
      const fromProducts = [...new Set((allProducts ?? []).map((p) => p.size).filter((s): s is string => !!s))].sort();
      if (fromProducts.length > 0) sizes = fromProducts;
    }

    const { data: children } = await supabase
      .schema("favelastore")
      .from("categories")
      .select("id, name, slug")
      .eq("parent_id", category.id)
      .eq("is_active", true)
      .order("sort_order", { ascending: true });

    let siblings: { id: string; name: string; slug: string }[] = [];
    if (category.parent_id) {
      const { data: sibs } = await supabase
        .schema("favelastore")
        .from("categories")
        .select("id, name, slug")
        .eq("parent_id", category.parent_id)
        .eq("is_active", true)
        .order("sort_order", { ascending: true });
      siblings = sibs ?? [];
    }

    const fullPath = segments.join("/");
    return {
      category: { id: category.id, slug: fullPath, name: category.name },
      products: productList,
      sizes,
      children: children ?? [],
      siblings,
    };
  } catch {
    return { category: null, products: [], sizes: [], children: [], siblings: [] };
  }
}

export type HomeProductCard = {
  id: string;
  name: string | null;
  price: number | null;
  size: string | null;
  stock: number | null;
  imageUrl: string | null;
};

function homeProductSizeLabel(
  size: string | null | undefined,
  categoryName: string | null | undefined
) {
  const productSize = typeof size === "string" ? size.trim() : "";
  if (productSize) return productSize;

  const category = typeof categoryName === "string" ? categoryName.trim() : "";
  if (!category) return null;

  const looksLikeSize =
    /^(pp|p|m|g|gg|xg|xgg|xl|xxl|xs|s|l|infantil|juvenil|kids|feminina|feminino)$/i.test(
      category
    );

  return looksLikeSize ? category : null;
}

export async function getHomeProductsByIds(
  ids: string[]
): Promise<HomeProductCard[]> {
  try {
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || ids.length === 0) return [];
    const storeSlug = activeSecondaryStoreSlug();
    const supabase = storeSlug ? catalogSupabaseForListings() : createPublicClient();
    if (!supabase) return [];

    let idList = [...ids];
    let listingMap = new Map<string, { priceOverride: number | null }>();
    if (storeSlug) {
      listingMap = (await fetchVisibleListingPriceMap(supabase, storeSlug)).map;
      idList = idList.filter((id) => listingMapHas(listingMap, id));
      if (idList.length === 0) return [];
    }

    const { data } = await supabase
      .schema("favelastore")
      .from("products")
      .select(
        "id, name, price, size, stock, categories(name), product_images(url, storage_path)"
      )
      .eq("is_active", true)
      .in("id", idList);

    const mapped = (data ?? []).map((product: any) => ({
      id: product.id as string,
      name: (product.name as string | null | undefined) ?? null,
      price: (product.price as number | null | undefined) ?? null,
      size: homeProductSizeLabel(
        (product.size as string | null | undefined) ?? null,
        (product.categories?.name as string | null | undefined) ?? null
      ),
      stock: (product.stock as number | null | undefined) ?? null,
      imageUrl: productImageUrl(
        (product.product_images as
          | { url?: string | null; storage_path?: string }[]
          | null) ?? null
      ),
    }));

    if (storeSlug && listingMap.size > 0) {
      for (const p of mapped) {
        const e = getListingPriceEntry(listingMap, p.id);
        if (e && e.priceOverride != null) {
          p.price = e.priceOverride;
        }
      }
    }

    const byId = new Map(mapped.map((product) => [product.id, product]));
    return ids
      .map((id) => byId.get(id))
      .filter((product): product is HomeProductCard => !!product);
  } catch {
    return [];
  }
}

export async function getHomeLatestProducts(
  limit = 8,
  excludeIds: string[] = []
): Promise<HomeProductCard[]> {
  try {
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL) return [];
    const storeSlug = activeSecondaryStoreSlug();
    const supabase = storeSlug ? catalogSupabaseForListings() : createPublicClient();
    if (!supabase) return [];

    let listingMap: Map<string, { priceOverride: number | null }> | null = null;
    let rows: any[] = [];

    if (storeSlug) {
      listingMap = (await fetchVisibleListingPriceMap(supabase, storeSlug)).map;
      const allowedIds = [...listingMap.keys()];
      if (allowedIds.length === 0) return [];
      const maxIn = 1000;
      const idBatch = allowedIds.length > maxIn ? allowedIds.slice(0, maxIn) : allowedIds;
      const res = await supabase
        .schema("favelastore")
        .from("products")
        .select(
          "id, name, price, size, stock, created_at, categories(name), product_images(url, storage_path)"
        )
        .eq("is_active", true)
        .in("id", idBatch)
        .order("created_at", { ascending: false })
        .limit(Math.max(limit * 4, limit + excludeIds.length));
      rows = res.data ?? [];
    } else {
      const res = await supabase
        .schema("favelastore")
        .from("products")
        .select(
          "id, name, price, size, stock, created_at, categories(name), product_images(url, storage_path)"
        )
        .eq("is_active", true)
        .order("created_at", { ascending: false })
        .limit(limit);
      rows = res.data ?? [];
    }

    rows.sort((a, b) => {
      const da = String(a.created_at ?? "");
      const db = String(b.created_at ?? "");
      return da > db ? -1 : da < db ? 1 : 0;
    });

    const exclude = new Set(excludeIds);
    const products: HomeProductCard[] = [];
    for (const product of rows) {
      if (exclude.has(product.id)) continue;
      let price = (product.price as number | null | undefined) ?? null;
      if (listingMap) {
        const e = getListingPriceEntry(listingMap, product.id as string);
        if (e?.priceOverride != null) price = e.priceOverride;
      }
      products.push({
        id: product.id as string,
        name: (product.name as string | null | undefined) ?? null,
        price,
        size: homeProductSizeLabel(
          (product.size as string | null | undefined) ?? null,
          (product.categories?.name as string | null | undefined) ?? null
        ),
        stock: (product.stock as number | null | undefined) ?? null,
        imageUrl: productImageUrl(
          (product.product_images as
            | { url?: string | null; storage_path?: string }[]
            | null) ?? null
        ),
      });
      if (products.length >= limit) break;
    }

    return products;
  } catch {
    return [];
  }
}

export async function getCategoryBySlug(slug: string) {
  try {
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL) return null;
    const supabase = await createClient();
    const { data } = await supabase
      .schema("favelastore")
      .from("categories")
      .select("*")
      .eq("slug", slug)
      .eq("is_active", true)
      .single();
    return data;
  } catch {
    return null;
  }
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";

function productImageUrl(images: { url?: string | null; storage_path?: string }[] | null): string | null {
  const img = images?.[0];
  if (!img) return null;
  if (img.url) return img.url;
  if (img.storage_path?.startsWith("http")) return img.storage_path;
  if (img.storage_path) return `${supabaseUrl}/storage/v1/object/public/favelastore_products/${img.storage_path}`;
  return null;
}

function resolveImageUrl(img: { url?: string | null; storage_path?: string }): string | null {
  if (!img) return null;
  if (img.url) return img.url;
  if (img.storage_path?.startsWith("http")) return img.storage_path;
  if (img.storage_path) return `${supabaseUrl}/storage/v1/object/public/favelastore_products/${img.storage_path}`;
  return null;
}

export type SearchProduct = {
  id: string;
  name: string | null;
  price: number | null;
  size: string | null;
  stock: number | null;
  /** Nome da categoria (ex.: "Camisas", "S", "Óculos") para separar camisas de outros. */
  categoryName: string | null;
  /** Mostrar "Tamanho" só quando o produto tem tamanho real (ex.: camisa). Óculos etc. não exibem. */
  showSize: boolean;
  imageUrl: string | null;
};

export async function getSearchProducts(q: string): Promise<SearchProduct[]> {
  try {
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !q?.trim() || q.trim().length < 2)
      return [];
    const supabase = await createClient();
    const term = `%${q.trim()}%`;

    // 1) Produtos cujo nome ou descrição contêm o termo
    const SEARCH_LIMIT = 500;

    const { data: byText, error: errText } = await supabase
      .schema("favelastore")
      .from("products")
      .select("id, name, price, size, stock, created_at, product_images(url, storage_path), categories(name)")
      .eq("is_active", true)
      .or(`name.ilike.${term},description.ilike.${term}`)
      .order("created_at", { ascending: false })
      .limit(SEARCH_LIMIT);
    if (errText) return [];

    // 2) Categorias cujo nome contém o termo (ex.: "bikini" → categoria Bikini)
    const { data: categoriesMatch } = await supabase
      .schema("favelastore")
      .from("categories")
      .select("id")
      .eq("is_active", true)
      .ilike("name", term);
    const categoryIds = (categoriesMatch ?? []).map((c) => c.id);

    // Usamos `any` aqui só para combinar resultados de duas consultas diferentes
    // sem brigar com o TypeScript; o retorno final é tipado em `SearchProduct`.
    let list = (byText ?? []) as any[];

    if (categoryIds.length > 0) {
      const { data: byCategory } = await supabase
        .schema("favelastore")
        .from("products")
        .select("id, name, price, size, stock, created_at, product_images(url, storage_path), categories(name)")
        .eq("is_active", true)
        .in("category_id", categoryIds)
        .order("created_at", { ascending: false })
        .limit(SEARCH_LIMIT);
      const byCat = (byCategory ?? []) as any[];
      const seen = new Set(list.map((p) => p.id));
      for (const p of byCat) {
        if (!seen.has(p.id)) {
          seen.add(p.id);
          list.push(p);
        }
      }
      list.sort((a, b) => {
        const da = a.created_at ?? "";
        const db = b.created_at ?? "";
        return da > db ? -1 : da < db ? 1 : 0;
      });
      list = list.slice(0, SEARCH_LIMIT);
    }

    const storeSlugSearch = activeSecondaryStoreSlug();
    if (storeSlugSearch) {
      const lc = catalogSupabaseForListings();
      if (!lc) return [];
      const { map } = await fetchVisibleListingPriceMap(lc, storeSlugSearch);
      list = list.filter((p) => listingMapHas(map, p.id));
      for (const p of list) {
        const e = getListingPriceEntry(map, p.id);
        if (e?.priceOverride != null) p.price = e.priceOverride;
      }
    }

    const TAMANHOS_ROUPA = ["pp", "p", "xs", "s", "small", "m", "l", "xl", "xxl", "xxxl", "xxxxl", "feminina", "infantil"];
    const isTamanhoRoupa = (v: string) => {
      const low = v.trim().toLowerCase();
      if (!low) return false;
      if (TAMANHOS_ROUPA.includes(low)) return true;
      if (/^\d{2}$/.test(low) || /^\d{2,3}$/.test(low)) return true;
      return false;
    };

    return list.map((p) => {
      const images = p.product_images ?? null;
      const categoryName = p.categories?.name?.trim() ?? null;
      const rawSize = p.size ?? categoryName;
      const hasSize = rawSize != null && String(rawSize).trim() !== "";
      const showSize = hasSize && isTamanhoRoupa(String(rawSize));
      return {
        id: p.id,
        name: p.name ?? null,
        price: p.price ?? null,
        size: p.size ?? categoryName,
        stock: (p.stock as number | null | undefined) ?? null,
        categoryName,
        showSize,
        imageUrl: productImageUrl(images),
      };
    });
  } catch {
    return [];
  }
}

export async function getProductById(id: string) {
  try {
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL) return null;
    const supabase = await createClient();
    const { data, error } = await supabase
      .schema("favelastore")
      .from("products")
      .select("id, name, slug, description, price, size, category_id, stock, shopify_product_url, product_images(url, storage_path, sort_order), categories(name)")
      .eq("id", id)
      .eq("is_active", true)
      .single();
    if (error && process.env.NODE_ENV === "development") {
      // eslint-disable-next-line no-console
      console.warn("[getProductById] Supabase error:", error.code, error.message);
    }
    if (!data) return null;
    const row = data as any;
    const storeSlugProduct = activeSecondaryStoreSlug();
    if (storeSlugProduct) {
      const lc = catalogSupabaseForListings();
      if (!lc) return null;
      const { map } = await fetchVisibleListingPriceMap(lc, storeSlugProduct);
      if (!listingMapHas(map, row.id as string)) return null;
      const e = getListingPriceEntry(map, row.id as string);
      if (e?.priceOverride != null) row.price = e.priceOverride;
    }
    const imagesRaw = (row.product_images as { url?: string | null; storage_path?: string; sort_order?: number }[] | null) ?? [];
    const imagesSorted = [...imagesRaw].sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0));
    const imageUrls = imagesSorted.map((img) => resolveImageUrl(img)).filter((u): u is string => !!u);
    const imgUrl = imageUrls[0] ?? null;
    const categoryName = (row.categories?.name as string | null | undefined)?.trim() ?? null;
    const sizeFromProduct = (row.size as string | null | undefined) ?? null;
    return {
      id: row.id as string,
      name: row.name as string,
      description: (row.description as string | null | undefined) ?? null,
      price: (row.price as number | null | undefined) ?? null,
      size: sizeFromProduct ?? categoryName,
      imageUrl: imgUrl,
      imageUrls,
      stock: (row.stock as number | null | undefined) ?? null,
      categoryId: (row.category_id as string | null | undefined) ?? null,
      categoryName,
      shopifyProductUrl: (row.shopify_product_url as string | null | undefined)?.trim() || null,
    };
  } catch {
    return null;
  }
}

export type ProductInCategory = {
  id: string;
  name: string | null;
  price: number | null;
  size: string | null;
  imageUrl: string | null;
  stock: number | null;
};

export async function getOtherProductsInCategory(
  categoryId: string,
  excludeProductId: string,
  limit = 12
): Promise<ProductInCategory[]> {
  try {
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL) return [];
    const storeSlug = activeSecondaryStoreSlug();
    const supabase = storeSlug ? catalogSupabaseForListings() : createPublicClient();
    if (!supabase) return [];
    const fetchLimit = storeSlug ? Math.min(limit * 6, 80) : limit;
    const { data } = await supabase
      .schema("favelastore")
      .from("products")
      .select("id, name, price, size, stock, product_images(url, storage_path)")
      .eq("category_id", categoryId)
      .eq("is_active", true)
      .neq("id", excludeProductId)
      .order("sort_order", { ascending: true })
      .order("name", { ascending: true })
      .limit(fetchLimit);
    let rows = (data ?? []) as any[];
    if (storeSlug) {
      const { map } = await fetchVisibleListingPriceMap(supabase, storeSlug);
      rows = filterAndApplyListingPrices(
        rows as { id: string; price?: number | null }[],
        map
      ) as any[];
      rows = rows.slice(0, limit);
    }
    return rows.map((row) => {
      const images = (row.product_images as { url?: string | null; storage_path?: string }[] | null) ?? null;
      return {
        id: row.id as string,
        name: (row.name as string | null | undefined) ?? null,
        price: (row.price as number | null | undefined) ?? null,
        size: (row.size as string | null | undefined) ?? null,
        imageUrl: productImageUrl(images),
        stock: (row.stock as number | null | undefined) ?? null,
      };
    });
  } catch {
    return [];
  }
}

/** Retorna o caminho de slugs da categoria (ex: ['camisas', 'm']) para montar /catalogo/camisas/m */
export async function getCategorySlugPath(categoryId: string): Promise<string[]> {
  try {
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL) return [];
    const supabase = createPublicClient();
    if (!supabase) return [];
    const path: string[] = [];
    let currentId: string | null = categoryId;
    while (currentId) {
      const { data } = await supabase
        .schema("favelastore")
        .from("categories")
        .select("id, slug, parent_id")
        .eq("id", currentId)
        .single();
      const row = data as { id: string; slug: string; parent_id: string | null } | null;
      if (!row) break;
      path.unshift(row.slug);
      currentId = row.parent_id;
    }
    return path;
  } catch {
    return [];
  }
}
