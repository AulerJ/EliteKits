import { HeroSection } from "@/components/HeroSection";
import { HomeCategoriesCarousel } from "@/components/HomeCategoriesCarousel";
import { HomeEncomendaBanner } from "@/components/HomeEncomendaBanner";
import { HomeLatestProducts } from "@/components/HomeLatestProducts";
import { InstagramSection } from "@/components/InstagramSection";
import { HomeReviewsCarousel } from "@/components/HomeReviewsCarousel";
import {
  getHomePageConfig,
  getHomeProductsByIds,
  getCategories,
  getHeroImages,
  getHomeReviewImages,
  getHomeLatestProducts,
} from "@/lib/supabase/queries";
import { HomeFooter } from "@/components/HomeFooter";

export const revalidate = 180;

const INSTAGRAM_URL = "https://www.instagram.com/favela_store_usa";
const INSTAGRAM_USERNAME = "favela_store_usa";
const INSTAGRAM_EMBED_SRC = "https://www.instagram.com/favela_store_usa/embed/";

export default async function HomePage() {
  const [categories, heroImages, homeReviewImages, homeConfig] = await Promise.all([
    getCategories(),
    getHeroImages(),
    getHomeReviewImages(),
    getHomePageConfig(),
  ]);

  const [featuredProducts, latestProducts] = await Promise.all([
    getHomeProductsByIds(homeConfig.featuredProductIds),
    getHomeLatestProducts(8, homeConfig.featuredProductIds),
  ]);

  const whatsappNumber =
    process.env.NEXT_PUBLIC_WHATSAPP_NUMBER?.replace(/\D/g, "") || "";

  const sections = {
    categories: (
      <section
        key="categories"
        className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-12"
      >
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-zinc-900 sm:text-3xl">
            Todos os produtos
          </h2>
          <p className="mt-1 text-zinc-600">
            Escolha uma categoria para ver os produtos
          </p>
        </div>
        <HomeCategoriesCarousel
          categories={categories.map((cat) => ({
            name: cat.name,
            slug: cat.slug,
            image: cat.image,
          }))}
        />
      </section>
    ),
    "featured-products":
      featuredProducts.length > 0 ? (
        <HomeLatestProducts
          key="featured-products"
          products={featuredProducts}
          title="Produtos em destaque"
          description="Escolhidos por voc&ecirc; no admin para aparecer primeiro"
        />
      ) : null,
    "latest-products":
      latestProducts.length > 0 ? (
        <HomeLatestProducts key="latest-products" products={latestProducts} />
      ) : null,
    reviews:
      homeReviewImages.length > 0 ? (
        <HomeReviewsCarousel key="reviews" images={homeReviewImages} />
      ) : null,
    "encomenda-banner":
      homeConfig.encomendaBannerUrl ? (
        <HomeEncomendaBanner
          key="encomenda-banner"
          imageUrl={homeConfig.encomendaBannerUrl}
          whatsappNumber={whatsappNumber}
        />
      ) : null,
    instagram: (
      <InstagramSection
        key="instagram"
        instagramUrl={INSTAGRAM_URL}
        username={INSTAGRAM_USERNAME}
        embedSrc={INSTAGRAM_EMBED_SRC}
      />
    ),
  } as const;

  return (
    <main className="overflow-x-hidden pb-6 sm:pb-10">
      {heroImages.length > 0 && <HeroSection images={heroImages} />}
      {homeConfig.sectionOrder.map((sectionId) => sections[sectionId])}
      <HomeFooter whatsappNumber={whatsappNumber} />
    </main>
  );
}

