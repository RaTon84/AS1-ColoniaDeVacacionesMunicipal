function BannerBienvenida() {
  return (
    <section
      className="relative flex min-h-[145px] items-center bg-white bg-cover bg-center bg-no-repeat"
      style={{ backgroundImage: "url('/images/banner-colonia.png')" }}
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-gradient-to-r from-white via-white/85 to-transparent sm:hidden"
      />

      <div className="relative mx-auto w-full max-w-[1440px] px-4 py-5 sm:px-6">
        <div className="max-w-[70%] sm:max-w-[52%]">
          <h1 className="text-2xl font-extrabold leading-tight text-[#142D50] sm:text-3xl xl:text-4xl">
            Bienvenidos a la
            <span className="block text-[#0862AE]">Colonia Municipal</span>
          </h1>

          <p className="mt-2 text-sm text-[#243B5A] sm:text-base">
            Un verano para jugar, aprender y hacer amigos
          </p>
        </div>
      </div>
    </section>
  )
}

export default BannerBienvenida