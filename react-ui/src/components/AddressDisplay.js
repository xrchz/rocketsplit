// Simple component that shows the first 4 and last 4 characters of an address. 
import { useState } from "react";

const AddressDisplay = ({address, label}) => {

    const [copied, setCopied] = useState(false);

    const handleClick = () => {
        // Create a temporary textarea element to copy the text to the clipboard
        const textarea = document.createElement('textarea');
        textarea.value = address;
        document.body.appendChild(textarea);
        textarea.select();
      
        // Copy the text to the clipboard
        document.execCommand('copy');
      
        // Remove the temporary textarea element
        document.body.removeChild(textarea);

        // Set the copied state to true
        setCopied(true);

        // Reset the copied state after a short delay (e.g., 2 seconds)
        setTimeout(() => {
            setCopied(false);
        }, 2000);
      };
    

    return (
        <>
            <div className="label">{label}</div>
            <div className="address-display" onClick={handleClick}>
                <span>{address.substring(0, 4)}</span>
                <span>...</span>
                <span>{address.substring(address.length - 4, address.length)}</span>
                {copied && <span style={{ marginLeft: '5px', color: 'green' }}><img className="check-mark" alt="Address Copied" src="check-mark.svg"></img></span>}
                {!copied && <span style={{ marginLeft: '5px' }}><img className="copy-mark" alt="Copy Address" src="copy-icon.svg"></img></span>}
            </div>
        </>
    )
}

export default AddressDisplay;