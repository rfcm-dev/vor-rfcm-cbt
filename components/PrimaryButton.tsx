export default function PrimaryButton(
  props: React.ButtonHTMLAttributes<HTMLButtonElement>
) {
  const { className = "", ...rest } = props;
  return (
    <button
      {...rest}
      className={`w-full rounded-lg bg-rfcm-red hover:bg-rfcm-red-dark text-white font-semibold py-3 transition-colors disabled:opacity-50 ${className}`}
    />
  );
}
