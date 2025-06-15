
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useToast } from "@/hooks/use-toast";

const schema = z.object({
  email: z.string().email("Please enter a valid email"),
});

type NewsletterForm = z.infer<typeof schema>;

const NewsletterSignup = () => {
  const { toast } = useToast();
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset,
  } = useForm<NewsletterForm>({
    resolver: zodResolver(schema),
  });

  function onSubmit(data: NewsletterForm) {
    toast({
      title: "Thank you for subscribing!",
      description: "You’ll receive updates and offers from Nidhis soon.",
    });
    reset();
  }

  return (
    <section className="bg-gold/10 py-16" id="newsletter">
      <div className="container max-w-2xl mx-auto rounded-xl px-4 text-center">
        <h3 className="text-2xl md:text-3xl font-playfair font-bold text-saffron mb-2">
          Subscribe to Our Newsletter
        </h3>
        <p className="mb-6 text-neutral-700">
          Get exclusive offers, new arrivals, and healthy tips straight to your inbox.
        </p>
        <form
          className="flex flex-col md:flex-row gap-3 items-center justify-center"
          onSubmit={handleSubmit(onSubmit)}
        >
          <input
            type="email"
            className="w-full md:w-2/3 px-5 py-3 rounded-full border border-gold focus:ring-2 focus:ring-saffron focus:outline-none transition text-neutral-900 placeholder:text-neutral-400"
            placeholder="Enter your email"
            {...register("email")}
            disabled={isSubmitting}
          />
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full md:w-auto px-6 py-3 rounded-full bg-saffron hover:bg-gold transition-colors text-white font-bold text-lg shadow"
          >
            Subscribe
          </button>
        </form>
        {errors.email && (
          <p className="mt-3 text-red-600 font-medium">{errors.email.message}</p>
        )}
      </div>
    </section>
  );
};

export default NewsletterSignup;
